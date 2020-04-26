const { renderToHtml } = require("gatsby-source-notion-database/lib/renderers");

module.exports = {
  siteMetadata: {
    title: `Gatsby Notion Example`
  },
  plugins: [
    `gatsby-plugin-react-helmet`,
    {
      resolve: "gatsby-source-notion-database",
      options: {
        databaseViewUrl:
          "https://www.notion.so/iansinnott/86067d10678c4e5496ad2a50a12eacb4?v=0d5861efdb1f482d81fb1f9e6f32842a",
        makeSlug: node => `node/${node.id}`
      }
    },
    `gatsby-plugin-typescript`
  ]
};
