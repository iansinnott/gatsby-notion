const { renderToHtml } = require('gatsby-source-notion-database/lib/renderers');

module.exports = {
  siteMetadata: {
    title: `Gatsby Notion Example`,
  },
  plugins: [
    `gatsby-plugin-react-helmet`,
    {
      resolve: 'gatsby-source-notion-database',
      options: {
        name: 'Quirky',
        databaseViewUrl:
          'https://www.notion.so/iansinnott/c6001aa9780c4240a219fa5819773e99?v=49e37d3868a14396b05c17440bf05966',
        // databaseViewUrl:
        //   "https://www.notion.so/iansinnott/31bc07fbe2704be095c3c34755011b5e?v=54e9d28603954141bce78b2c719d5fd3",
        renderers: {
          html: renderToHtml(),
        },
        debug: true,
      },
    },
    // Add typescript stack into webpack
    `gatsby-plugin-typescript`,
  ],
};
