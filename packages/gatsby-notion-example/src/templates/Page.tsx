import * as React from 'react';
import { graphql } from 'gatsby';
import Layout from '../layouts';

export default ({ data }) => {
  const { row } = data;
  return (
    <div>
      <p>Row ID {row.id}</p>
      <div dangerouslySetInnerHTML={{ __html: row.rendered.html }}></div>
    </div>
  );
};
export const query = graphql`
  query($slug: String!) {
    row: notionCollectionNodePostMetadata(id: { eq: $slug }) {
      id
      rendered {
        html
      }
    }
  }
`;
