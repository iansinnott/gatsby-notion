import * as fs from 'fs';
import {
  NotionsoPluginOptions,
  NotionPropertyValue,
  DateObject,
  CollectionBlock,
  PropertyDetails,
  NotionContentBlock,
} from './types';
import { SourceNodesArgs, Reporter } from 'gatsby';
import { createAgent } from 'notionapi-agent';
import { inspect } from 'util';
import mapIntermediateContentRepresentation from './mapIntermediateContentRepresentation';
import { NOTION_NODE_PREFIX, tap } from './helpers';

const mapNotionPropertyValue = ({
  type,
  value,
}: {
  type: string;
  value: NotionPropertyValue;
}): string | number | boolean => {
  switch (type) {
    case 'title':
      return value.map((x) => x[0]).join('');
    case 'multi_select':
      return value[0][0]; // It appears the tags get put together into a comma-separated string
    case 'date': {
      const dateObjects = value[0][1].map((x: [string, DateObject]) => x[1]);
      prettyPrint(dateObjects);
      return new Date(dateObjects[0].start_date).toISOString();
    }
    default:
      return `UNKNOWN_PROPERTY_TYPE -- ${type}`;
      break;
  }
};

interface Logger {
  log: (s: string) => any;
  info: (s: string) => any;
  warn: (s: string) => any;
}

const wrapReporter = (
  reporter: Reporter,
): Logger & { panic: (s: string) => any } => {
  return {
    log: (x: string) => reporter.log(`gatsby-source-notion-database ${x}`),
    info: (x: string) => reporter.info(`gatsby-source-notion-database ${x}`),
    warn: (x: string) => reporter.warn(`gatsby-source-notion-database ${x}`),
    panic: (x: string) => reporter.panic(`gatsby-source-notion-database ${x}`),
  };
};

// Given a smushed guid expand it to the usual form using hyphens
const expandGuid = (id: string) => {
  if (!id.includes('-')) {
    return (
      id.slice(0, 8) +
      '-' +
      id.slice(8, 12) +
      '-' +
      id.slice(12, 16) +
      '-' +
      id.slice(16, 20) +
      '-' +
      id.slice(20)
    );
  }

  return id;
};

const parseCollectionViewUrl = (s: string, { warn }: Logger = console) => {
  let url = new URL(s);
  const v = url.searchParams.get('v');

  if (!url.host.includes('notion')) {
    warn(`URL does not appear to be a notion URL: ${s}`);
    return;
  }

  if (typeof v !== 'string') {
    warn(
      `URL does not appear to have a view ID. Expected the query string to invlude \`v=...\`: ${s}`,
    );
    return;
  }

  const [_, spaceId, pageId] = url.pathname.split('/');

  return {
    spaceId,
    pageId: expandGuid(pageId),
    collectionViewId: expandGuid(v),
  };
};

const prettyPrint = (x: any) => {
  console.log(inspect(x, { colors: true, depth: 30 }));
};

export const notEmpty = <T>(value: T | null | undefined): value is T => {
  return value !== null && value !== undefined;
};

const createNodesFromCollection = async (
  context: SourceNodesArgs,
  config: NotionsoPluginOptions,
) => {
  const { debug } = config;
  const notion = createAgent({ debug });
  const reporter = wrapReporter(context.reporter);
  const parsed = parseCollectionViewUrl(config.databaseViewUrl);

  if (!parsed) {
    reporter.panic(`Could not parse database view URL: ${config.rootPageUrl}`);
    return;
  }

  const { pageId, collectionViewId } = parsed;

  reporter.info(
    `Got to the plugin. Will do interesting things with collection ${JSON.stringify(
      parsed,
    )}`,
  );

  const loadPageChunk = (id: string) => {
    const data = {
      pageId: id,
      limit: 100000,
      cursor: { stack: [] },
      chunkNumber: 0,
      verticalColumns: false,
    };
    return notion.loadPageChunk(data);
  };

  const queryCollection = async ({
    pageId,
    collectionViewId,
  }: {
    pageId: string;
    collectionViewId: string;
  }) => {
    // Get the full collection view so that we will have acecss to its query object
    const page = await loadPageChunk(pageId);
    const collectionView =
      page?.recordMap?.collection_view?.[collectionViewId]?.value;
    // @ts-ignore
    const collectionId = page?.recordMap?.block?.[pageId]?.value?.collection_id;
    const collection = page?.recordMap?.collection?.[collectionId]?.value;

    if (!collectionView || !collection) {
      throw new Error(
        'Mismatch between collectionId and collectionViewId, or otherwise malformed ID',
      );
    }

    const queryArgs = {
      collectionId: collection.id,
      collectionViewId,
      loader: {
        limit: 70,
        loadContentCover: true,
        // @ts-ignore
        searchQuery: '',
        type: 'table' as 'table', // TS infers type string ratehr than literal "table"
        userLocale: 'en',
        userTimeZone: 'Asia/Taipei',
      },
      // @ts-ignore
      query: collectionView.query2,
    };

    if (debug) {
      reporter.info(`querying notion`);
      prettyPrint(queryArgs);
    }

    const fetchContent = async (
      ids: string[],
      blockMap: { [k: string]: any },
    ) => {
      // Just to avoid odd situations
      if (ids.length === 0) return ids;

      if (ids.some((x) => typeof x !== 'string')) {
        throw new Error('Must pass an id of strings to fetch content');
      }

      const preMapped = ids
        .filter((id) => blockMap[id])
        .map((id) => blockMap[id].value);

      // All fetched already, nothing to see here
      if (preMapped.length === ids.length) {
        return preMapped;
      }

      const requests = ids.map((id) => ({ table: 'block' as 'block', id }));

      const records = notion.getRecordValues({
        requests,
      });

      return (await records).results
        .map((x) => x.value)
        .map((x) => {
          if ('id' in x) {
            blockMap[x.id] = x;
          }
          return x;
        });
    };

    const getContentForBlocks = async (blocks, blockMap) => {
      const result = [];
      debugger;
      for (const b of blocks) {
        // Defend against empty rows in collections. Notion does not even include a properties object for these rows
        if (!b.properties) {
          reporter.warn(
            `No properties found for CONTENT block ${b.id} of type ${b.type}. Most likely this is a newline`,
          );
          if (b.type === 'text') {
            result.push({
              ...b,
              type: 'newline',
              properties: {
                title: [['\n']],
              },
            });
          }
          continue;
        }

        // The node may already have content fetched, in which case it will be an array of objects. Do not fetch if this is the case.
        if (b.content) {
          const fetched = b.content.every((x) => typeof x === 'string')
            ? await fetchContent(b.content, blockMap)
            : b.content;
          result.push({
            ...b,
            // Recurse
            content: await getContentForBlocks(fetched, blockMap),
          });
        } else {
          result.push(b);
        }
      }

      debugger;

      return result;
    };

    return notion.queryCollection(queryArgs).then(async (raw) => {
      const { schema } = collection;
      const missingContentBlocks = [];
      const blockMap = raw.recordMap.block;

      const rows = raw.result.blockIds
        .map((id) => {
          const x = blockMap[id].value as CollectionBlock;

          if (!x) {
            reporter.info(
              `Found undefined block value for id ${id}, skipping...`,
            );
          }

          return x;
        })
        .filter(notEmpty)
        .map(
          tap((x) => {
            if (!x.properties) {
              reporter.warn(
                `No properties found for ROW block ${x.id} of type ${x.type}. Most likely this is an empty row`,
              );
            }
          }),
        )
        .filter((x) => x.properties)
        .map((x) => {
          const content = x.content
            ? x.content
                .filter((id) => {
                  const isBlockMapped = Boolean(blockMap[id]);
                  if (!isBlockMapped) {
                    reporter.warn(
                      `No body block found for ID ${id}. Skipping this block. If you think this is a mistake try viewing the content of page: ${x.id}`,
                    );
                  }
                  return isBlockMapped;
                })
                .map((id) => blockMap[id])
                .map((y) => {
                  return y.value;
                })
            : undefined;
          const propertyDetails: {
            [k: string]: PropertyDetails;
          } = Object.entries(x.properties)
            .filter(([pid, value]) => {
              const inSchema = schema[pid];
              if (!inSchema) {
                reporter.warn(
                  `No property mapping found for PID ${pid}. Skipping property. If you think this is a mistake try viewing the content of page: ${x.id}`,
                );
              }

              return inSchema;
            })
            .map(([pid, value]) => {
              const { name, type } = schema[pid];
              return {
                pid,
                // @ts-ignore
                value: mapNotionPropertyValue({ type, value }),
                _raw: JSON.stringify(value),
                name,
                type,
              };
            })
            .reduce((agg, y) => ({ ...agg, [y.name]: y }), {});

          // A direct mapping of property names to values. This should be more
          // intuitive to access than getting a property and then saying
          // .value
          const properties = Object.entries(propertyDetails).reduce(
            (agg, [name, details]) => {
              return { ...agg, [name]: details.value };
            },
            {},
          );

          return {
            ...x,
            _notionBlockId: x.id,
            _propertyDetails: propertyDetails,
            properties,
            content,
          };
        });

      const blocks = await getContentForBlocks(rows, blockMap);

      /**
       * ------------------------------------------------------------------------------------------------
       * ------------------------------------------------------------------------------------------------
       * This needs work:
       * I didn't realize before but the data structure is not actually flat.
       * For nested lists, at the very least, there's a lot more going on. Each
       * bulleted_list can have a content property which will be an array of ids.
       * I think the best approach is to first do a revursive run through of
       * the data, grab all content ids, then collect the ones that are not
       * included in the already-fetched record map and fetch them all using
       * getRecordValues. Only at that point, once all have been fetched, can I
       * match ids to values in the nested data structure (also needs to be done
       * recursively)
       * ------------------------------------------------------------------------------------------------
       * ------------------------------------------------------------------------------------------------
       */

      const result = {
        raw,
        missingContentBlocks,
        blocks,
        collection,
        collectionView,
      };

      if (debug) {
        const outfile = '/tmp/fetched-and-mapped.json';
        reporter.info(`Writing debug file output to: ${outfile}`);
        try {
          fs.writeFileSync(outfile, JSON.stringify(result, null, 2), {
            encoding: 'utf8',
          });
        } catch (err) {
          reporter.info(`Could not write to ${outfile}`);
        }
      }

      return result;
    });
  };

  const { blocks, collection } = await queryCollection({
    pageId,
    collectionViewId,
  });

  const collectionName = mapNotionPropertyValue({
    type: 'title',
    value: collection.name || [['ANONYMOUS_TABLE']],
  }) as string;
  const formattedCollectionName = collectionName
    .replace(/ /g, '_')
    .replace(/[^A-Za-z_]/, '');
  prettyPrint(blocks);
  prettyPrint(collection);

  const NODE_TYPE = NOTION_NODE_PREFIX + formattedCollectionName;

  // context.actions.createTypes(`
  //   type ${NODE_TYPE}RenderedOutput {
  //     html: String!
  //   }
  //   type ${NODE_TYPE} implements Node {
  //     version: Int
  //     type: String!
  //     created_time: Int
  //     last_edited_time: Int
  //     parent_id: String
  //     parent_table: String
  //     alive: Boolean
  //     created_by_table: String
  //     created_by_id: String
  //     last_edited_by_table: String
  //     last_edited_by_id: String
  //     rendered: ${NODE_TYPE}RenderedOutput
  //     _notionBlockId: String!
  //   }
  // `);

  // @ts-ignore
  for (const block of blocks.map(mapIntermediateContentRepresentation)) {
    let renderedContent = {};

    if (config.renderers) {
      Object.entries(config.renderers).forEach(([k, render]) => {
        try {
          // @ts-ignore
          renderedContent[k] = render(block);
        } catch (err) {
          reporter.warn(
            `[RENDER ERROR] Additional renderer supplied for key "${k}" threw an error while rendering. See next line:`,
          );
          reporter.warn(`[RENDER ERROR] ${err.message}`);
        }
      });
    }

    const node = {
      ...block,
      id: context.createNodeId(block.id),
      rendered: renderedContent,
      internal: {
        type: NODE_TYPE,
        contentDigest: context.createContentDigest({
          data: JSON.stringify(block.content),
        }),
      },
    };

    // if (debug) {
    //   reporter.info(`Adding node`);
    //   prettyPrint(node);
    // }

    context.actions.createNode(node);
  }
};

export default createNodesFromCollection;
