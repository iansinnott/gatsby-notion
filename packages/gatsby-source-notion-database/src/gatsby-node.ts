import * as crypto from 'crypto';
import { inspect } from 'util';
import {
  GatsbyNode,
  SourceNodesArgs,
  CreateSchemaCustomizationArgs,
} from 'gatsby';
import { createAgent } from 'notionapi-agent';

import { NotionDatabasePluginOptions, NotionCollectionView } from './types';

const defaultConfig = {
  debug: false,
  downloadLocal: true,
};

console.log('Made it to gatsby node');

// Given a smushed guid expand it to the usual form using hyphens
const guid = (id: string) => {
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

const prettyPrint = (x: any) => {
  console.log(inspect(x, { colors: true, depth: 30 }));
};

export const sourceNodes: GatsbyNode['sourceNodes'] = async (
  context: SourceNodesArgs,
  pluginConfig: NotionDatabasePluginOptions,
): Promise<void> => {
  const config = { ...defaultConfig, ...pluginConfig };
  const { databaseViewUrl, name, debug } = config;
  const { reporter, actions, createNodeId, createContentDigest } = context;
  const notion = createAgent({ debug });

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

  const queryCollection = async ({ pageId, collectionViewId }) => {
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
        type: 'table', // ???
        userLocale: 'en',
        userTimeZone: 'Asia/Taipei',
      },
      // @ts-ignore
      query: collectionView.query2,
    };

    if (debug) {
      reporter.info(`gatsby-source-notion-database querying notion`);
      prettyPrint(queryArgs);
    }

    // @ts-ignore
    return notion.queryCollection(queryArgs).then((raw) => {
      const { schema } = collection;
      const blocks = raw.result.blockIds
        .map((id) => raw.recordMap.block[id].value)
        .map((x) => {
          const content = x.content
            ? x.content.map((id) => raw.recordMap.block[id]).map((y) => y.value)
            : undefined;
          const properties = Object.entries(x.properties)
            .map(([pid, value]) => {
              const { name, type } = schema[pid];
              return {
                pid,
                value,
                name,
                type,
              };
            })
            .reduce((agg, y) => ({ ...agg, [y.name]: y }), {});

          return {
            ...x,
            properties,
            content,
          };
        });

      return blocks;
    });
  };

  if (!databaseViewUrl) {
    reporter.panic(
      'gatsby-source-notion-database requires a databaseViewUrl parameter. This will be the URL of any view onto your database. It would look something like:\n\thttps://www.notion.so/USER_ACCOUNT_NAME/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx?v=yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy',
    );
    return;
  }

  if (!name) {
    reporter.panic(
      'gatsby-source-notion-database requires a name parameter. This is used to build the names of the GraphQL types',
    );
    return;
  }

  const { pageId, collectionViewId } = extractGuids(databaseViewUrl);

  if (!pageId || !collectionViewId) {
    reporter.panic(
      `gatsby-source-notion-database the databaseViewUrl you provided did not contain a database id and a database view id: ${databaseViewUrl}`,
    );
    return;
  }

  reporter.info(`gatsby-source-notion-database Page: ${pageId}`);
  reporter.info(
    `gatsby-source-notion-database Database View: ${collectionViewId}`,
  );
  reporter.info(`gatsby-source-notion-database URL: ${databaseViewUrl}`);

  const blocks = await queryCollection({ pageId, collectionViewId });

  debugger;
  for (const block of blocks) {
    const stringContent = JSON.stringify(block.content);
    const node = {
      id: `notion-${createNodeId(block.id)}`,
      properties: Object.values(block.properties),
      parent: null,
      children: [],
      content: block.content,
      internal: {
        type: `NotionPage${pluginConfig.name}`,
        mediaType: `text/html`,
        content: stringContent,
        contentDigest: 'FUCK' + Math.random(),
      },
    };

    if (debug) {
      reporter.info(`gatsby-source-notion-database creating node`);
      prettyPrint(node);
    }

    actions.createNode(node);
  }
};

const extractGuids = (url: string) => {
  const urlSegements = url.split('/');
  const guidSegment = urlSegements[urlSegements.length - 1];
  const [a, b] = guidSegment.split('?v=').map(guid);
  return { pageId: a, collectionViewId: b };
};

export const createSchemaCustomization: GatsbyNode['createSchemaCustomization'] = async (
  context: CreateSchemaCustomizationArgs,
  pluginConfig: NotionDatabasePluginOptions,
): Promise<void> => {
  const { actions } = context;
  const { createTypes } = actions;
  const typeDefs = `
    type NotionPage${pluginConfig.name}Att {
      att: String!
      value: String
    }

    type NotionPage${pluginConfig.name}Text {
      text: String!
      atts: [NotionPage${pluginConfig.name}Att!]
    }

    type NotionPage${pluginConfig.name}Property {
      propName: String!
      value: [NotionPage${pluginConfig.name}Text!]
    }

    type NotionPage${pluginConfig.name}Block {
      type: String!
      blockId: String!
      properties: [NotionPage${pluginConfig.name}Property!]
      attributes: [NotionPage${pluginConfig.name}Att!]
      blockIds: [String!]
    }

    type NotionPageProperty {
      name: String!
      type: String!
      pid: String!
      value: [[String]]
    }

    type NotionPage${pluginConfig.name} implements Node {
      id: String!
      properties: [NotionPageProperty]
      content: [NotionPage${pluginConfig.name}Block!]
    }
  `;
  createTypes(typeDefs);
};
