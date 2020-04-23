import * as React from 'react';
import Link from 'gatsby-link';
import { useStaticQuery, graphql } from 'gatsby';

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
  const data = useStaticQuery(graphql`
    query IndexQueryWithRows {
      site {
        siteMetadata {
          title
        }
      }

      # NOTE! The query field name is based on your database name
      database: allNotionDbPostMetadata(
        sort: { fields: properties___Date, order: DESC }
      ) {
        rows: nodes {
          id
          slug
          properties {
            Tags
            Name
            Date
          }
        }
      }
    }
  `);

  return (
    <div>
      <h1>Hi people</h1>
      <p>
        Welcome to your new <strong>{data.site.siteMetadata.title}</strong>{' '}
        site.
      </p>
      <p>Now go build something great.</p>
      {data.database.rows.map((row) => (
        <div key={row.id}>
          <Link to={`/${row.slug}`}>{row.properties.Name}</Link>
        </div>
      ))}
    </div>
  );
};

export default IndexPage;
