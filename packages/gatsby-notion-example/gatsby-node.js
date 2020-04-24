exports.createPages = async function({ actions, graphql }) {
  const { data } = await graphql(`
    query {
      db: allNotionDbPosts(
        sort: { fields: properties___created, order: DESC }
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
