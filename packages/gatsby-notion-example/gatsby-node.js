exports.createPages = async function({ actions, graphql }) {
  const { data } = await graphql(`
    query {
      db: allNotionCollectionNodePostMetadata(
        sort: { fields: properties___Date, order: DESC }
      ) {
        nodes {
          id
        }
      }
    }
  `);
  data.db.nodes.forEach((node) => {
    const slug = node.id;
    actions.createPage({
      path: slug,
      component: require.resolve(`./src/templates/Page.tsx`),
      context: { slug: slug },
    });
  });
};
