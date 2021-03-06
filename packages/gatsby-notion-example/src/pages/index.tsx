import * as React from "react";
import Link from "gatsby-link";
import { useStaticQuery, graphql } from "gatsby";

const IndexPage = () => {
  const data = useStaticQuery(graphql`
    query IndexQueryWithRows {
      site {
        siteMetadata {
          title
        }
      }
      collection: allNotionCollectionBlogDatabaseExample(
        sort: { fields: properties___created, order: DESC }
      ) {
        nodes {
          id
          slug
          content_html
          properties {
            created
            published
            status
            tags
            title
          }
        }
      }
    }
  `);

  return (
    <div>
      <h1>Hi people</h1>
      <p>
        Welcome to your new <strong>{data.site.siteMetadata.title}</strong>{" "}
        site.
      </p>
      <p>Now go build something great.</p>
      {data.collection.nodes.map(node => (
        <div key={node.id}>
          <Link to={`/${node.slug}`}>{node.properties.title}</Link>
        </div>
      ))}
    </div>
  );
};

export default IndexPage;
