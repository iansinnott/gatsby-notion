"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const React = require("react");
const gatsby_link_1 = require("gatsby-link");
const gatsby_1 = require("gatsby");
// Please note that you can use https://github.com/dotansimha/graphql-code-generator
// to generate all types from graphQL schema
// interface IndexPageProps {
//   data: {
//     site: {
//       siteMetadata: {
//         title: string;
//       };
//     };
//   };
// }
const IndexPage = () => {
    const data = gatsby_1.useStaticQuery(gatsby_1.graphql `
    query IndexQueryWithRows {
      site {
        siteMetadata {
          title
        }
      }

      # NOTE! The query field name is based on your database name
      database: allNotionDbPosts(
        sort: { fields: properties___created, order: DESC }
      ) {
        nodes {
          id
          slug
          properties {
            title
            created
            published
            status
            tags
          }
        }
      }
    }
  `);
    return (React.createElement("div", null,
        React.createElement("h1", null, "Hi people"),
        React.createElement("p", null,
            "Welcome to your new ",
            React.createElement("strong", null, data.site.siteMetadata.title),
            ' ',
            "site."),
        React.createElement("p", null, "Now go build something great."),
        data.database.nodes.map((node) => (React.createElement("div", { key: node.id },
            React.createElement(gatsby_link_1.default, { to: `/${node.slug}` }, node.properties.title))))));
};
exports.default = IndexPage;
//# sourceMappingURL=index.js.map