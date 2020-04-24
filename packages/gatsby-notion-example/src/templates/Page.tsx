import * as React from 'react';
import { graphql } from 'gatsby';
import Layout from '../layouts';

const styles = `
  pre {
    background: red;
  }
  blockquote {
    border-left: 5px solid gray;
  }
`;

export default ({ data }) => {
  const { row } = data;
  return (
    <div>
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <p>Row ID {row.id}</p>
      <div dangerouslySetInnerHTML={{ __html: row.content_html }}></div>
    </div>
  );
};
export const query = graphql`
  query($id: String!) {
    row: notionDbPosts(id: { eq: $id }) {
      id
      content_html
    }
  }
`;
