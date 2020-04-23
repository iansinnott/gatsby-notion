exports.createPages = async function({ actions, graphql }) {
  const { data } = await graphql(`
    query {
      db: allNotionDbPostMetadata(
        # These properties depend on your database view shape
        sort: { fields: properties___Date, order: DESC }
      ) {
        nodes {
          id
          slug
        }
      }
    }
  `);
  data.db.nodes.forEach((node) => {
    const { slug, id } = node;
    actions.createPage({
      path: slug,
      component: require.resolve(`./src/templates/Page.tsx`),
      context: { slug, id },
    });
  });
};
