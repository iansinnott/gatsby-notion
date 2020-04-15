module.exports = {
  siteMetadata: {
    title: `Gatsby Notion Example`
  },
  plugins: [
    `gatsby-plugin-react-helmet`,
    {
      resolve: "gatsby-source-notion-database",
      options: {
        name: "Quirky",
        databaseViewUrl:
          "https://www.notion.so/iansinnott/c6001aa9780c4240a219fa5819773e99?v=49e37d3868a14396b05c17440bf05966",
        debug: true
      }
    },
    // Add typescript stack into webpack
    `gatsby-plugin-typescript`
  ]
};
