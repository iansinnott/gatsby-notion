import * as React from "react";
import { graphql } from "gatsby";
import Layout from "../layouts";

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
      <h1>{row.properties.title}</h1>
      <p>
        Tags: <strong>{row.properties.tags}</strong>
      </p>
      <p>
        Created: <strong>{row.properties.created}</strong>
      </p>
      <div dangerouslySetInnerHTML={{ __html: row.content_html }}></div>
    </div>
  );
};
export const query = graphql`
  query($id: String!) {
    row: notionCollectionBlogDatabaseExample(id: { eq: $id }) {
      id
      content_html
      properties {
        title
        created
        status
        tags
      }
    }
  }
`;
