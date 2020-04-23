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
import { NOTION_NODE_PREFIX, tap, sleep } from './helpers';
import { LoadPageChunk } from 'notionapi-agent/dist/interfaces/notion-api/v3/loadPageChunk';
import { renderToHtml } from './renderers';

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
  const blockMap = {};

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

  const loadPageChunk = async (
    id: string,
    updatedAt?: number,
  ): Promise<LoadPageChunk.Response> => {
    let chunk: LoadPageChunk.Response | undefined;
    let refreshedAt;

    try {
      const cached = await context.cache.get(id);
      chunk = cached.chunk;
      refreshedAt = cached.refreshedAt;
    } catch (err) {
      // Do I need to ensure the cache file exists?
      await context.cache.set('gatsby-source-notion-database__INIT', true);
    }

    const shouldReload =
      updatedAt === undefined ||
      refreshedAt === undefined ||
      refreshedAt < updatedAt;

    if (updatedAt) debugger;

    if (chunk && !shouldReload) {
      if (config.debug) {
        reporter.info(`Cache hit for loadPageChunk ${id}`);
      }
      return chunk as LoadPageChunk.Response;
    }

    // TODO: In theory this needs to be modified to fetch more and more chunks
    // for very long pages, thus the name. By fetching roughly 1000 chunks we
    // will get most content for most pages but we may well end up with some
    // chopped off content. Just going to go with it for now.
    const data = {
      pageId: id,
      limit: 70 * 14,
      cursor: { stack: [] },
      chunkNumber: 0,
      verticalColumns: false,
    };

    chunk = await notion.loadPageChunk(data);

    await context.cache.set(id, { refreshedAt: Date.now(), chunk });

    // A quick rest before continuing. For something like a blog this
    // probably isn't an issue but for a real table of data who knows how
    // many rows there could be
    await sleep(1000);

    return chunk;
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
        limit: 70 * 14,
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

    const fetchContent = async (ids: string[]) => {
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

    // recursive logic works.... but not all node ids are returned in the initial raw data. Hm.
    const getContentForBlocks = async (blocks) => {
      const result = [];
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
            ? await fetchContent(b.content)
            : b.content;
          result.push({
            ...b,
            // Recurse
            content: await getContentForBlocks(fetched),
          });
        } else {
          result.push(b);
        }
      }

      return result;
    };

    return notion.queryCollection(queryArgs).then(async (raw) => {
      const { schema } = collection;
      const missingContentBlocks = [];

      Object.assign(blockMap, raw.recordMap.block);

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
          // const content = x.content
          //   ? x.content
          //       .filter((id) => {
          //         const isBlockMapped = Boolean(blockMap[id]);
          //         if (!isBlockMapped) {
          //           reporter.warn(
          //             `No body block found for ID ${id}. Skipping this block. If you think this is a mistake try viewing the content of page: ${x.id}`,
          //           );
          //         }
          //         return isBlockMapped;
          //       })
          //       .map((id) => blockMap[id])
          //       .map((y) => {
          //         return y.value;
          //       })
          //   : undefined;
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
            // content,
          };
        });

      // Load all pages
      for (const row of rows) {
        // TODO: skipCache if last_edited_time is more recent than last gatsby run. Need to store the last run time somewhere.

        if (!row.content || row.content.length === 0) {
          reporter.info('No content to fetch. Will not call loadPageChunk');
          continue;
        }

        // Load in all blocks from the row as a page if it has content
        const chunk = await loadPageChunk(row.id, row.last_edited_time);
        Object.assign(blockMap, chunk.recordMap.block);
      }

      // Hm, rather than loadPageChunk I think we could acutally use getRecordValues. The record IDs seem to be passed back without any pagination/

      // This will recurse and fill in all the content, but I think it would
      // be better to do it in a resolver, so as not to do it every time
      // unless the UI is actively calling for it
      const blocks = await getContentForBlocks(rows);

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
  for (const raw of blocks) {
    const block = mapIntermediateContentRepresentation(raw);

    let renderedContent: { [k: string]: string } = {};
    let renderers = [
      { name: 'json', render: JSON.stringify },
      { name: 'html', render: renderToHtml() },
    ];

    // If it's just a table with rows not being full pages there won't be any content
    if (block.content && block.content.length) {
      renderers.forEach((x) => {
        try {
          const k = `content_${x.name}`;
          debugger;
          renderedContent[k] = x.render(block);
        } catch (err) {
          reporter.warn(
            `[RENDER ERROR] Renderer "${x.name}" threw an error while rendering. See next line:`,
          );
          reporter.warn(`[RENDER ERROR] ${err.message}`);
        }
      });
    }

    const node = {
      ...block,
      ...renderedContent,
      id: context.createNodeId(block.id),
      internal: {
        type: NODE_TYPE,
        contentDigest: context.createContentDigest({
          data: JSON.stringify(block.content),
        }),
      },
    };

    // Add the slug
    // @ts-ignore
    node.slug = config.makeSlug(node);

    // if (debug) {
    //   reporter.info(`Adding node`);
    //   prettyPrint(node);
    // }

    context.actions.createNode(node);
  }
};

export default createNodesFromCollection;
