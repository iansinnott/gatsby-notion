import { GatsbyNode, SourceNodesArgs } from 'gatsby';
import { NotionsoPluginOptions } from './types';
import createNodesFromCollection from './createNodesFromCollection';

const defaultConfig = {
  debug: false,
  downloadLocal: true,
};

export const sourceNodes: GatsbyNode['sourceNodes'] = async (
  context: SourceNodesArgs,
  pluginConfig: NotionsoPluginOptions,
): Promise<void> => {
  const config = { ...defaultConfig, ...pluginConfig };
  const { databaseViewUrl, name } = config;
  const { reporter } = context;

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

  await createNodesFromCollection(context, config);
};
