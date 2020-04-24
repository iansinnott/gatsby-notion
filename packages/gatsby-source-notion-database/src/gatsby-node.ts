import { GatsbyNode, SourceNodesArgs } from 'gatsby';
import { NotionsoPluginOptions, IntermediateForm } from './types';
import createNodesFromCollection from './createNodesFromCollection';
import { isNotionNode } from './helpers';

const defaultConfig = {
  debug: false,
  downloadLocal: true,
  makeSlug: (x: IntermediateForm) => x.id,
};

export const sourceNodes: GatsbyNode['sourceNodes'] = async (
  context: SourceNodesArgs,
  pluginConfig: NotionsoPluginOptions,
): Promise<void> => {
  const config = { ...defaultConfig, ...pluginConfig };
  const { databaseViewUrl } = config;
  const { reporter } = context;

  if (!databaseViewUrl) {
    reporter.panic(
      'gatsby-source-notion-database requires a databaseViewUrl parameter. This will be the URL of any view onto your database. It would look something like:\n\thttps://www.notion.so/USER_ACCOUNT_NAME/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx?v=yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy',
    );
    return;
  }

  await createNodesFromCollection(context, config);
};
