import { SemanticString } from 'notionapi-agent/dist/interfaces';
import { BlockType, NotionContentBlock } from './types';

export const notEmpty = <T>(value: T | null | undefined): value is T => {
  return value !== null && value !== undefined;
};

const assertUnreachable = (): never => {
  throw new Error('nope');
};

const makeInlineChildren = (titleProp: SemanticString[] | undefined) => {
  if (!titleProp) return titleProp;

  return titleProp.map(([str, attrs]) => {
    // prettier-ignore
    // @ts-ignore
    const attributes = !attrs ? [] : attrs.map(([typ, meta]) => ({ type: typ, meta }));
    return {
      text: str,
      attributes,
    };
  });
};

const valueFromArray = (arr: any[] | undefined) => {
  if (!arr) return arr;
  // @ts-ignore
  return arr.flat().join('');
};

const mapContent = (content: Array<NotionContentBlock> | undefined) => {
  if (!content) {
    return [];
  }

  return content.map((y: NotionContentBlock) => {
    switch (y.type) {
      case 'header':
      case 'text': {
        const result = makeInlineChildren(y.properties?.title);
        // What does it mean when this is undefined? An empty line?
        return result
          ? { type: y.type, children: result }
          : { type: 'newline', children: [] };
      }
      case 'code': {
        return {
          type: y.type,
          children: makeInlineChildren(y.properties?.title),
          // @ts-ignore
          language: valueFromArray(y.properties?.language),
        };
      }
      case 'image': {
        return {
          type: y.type,
          children: [],
          // NOTE: The `source` property does indeed include an s3 image URL, but it's not accessible directly
          src: `https://www.notion.so/image/${encodeURIComponent(
            valueFromArray(y.properties?.source),
          )}`,
          caption: makeInlineChildren(y.properties?.caption),
          captionString: valueFromArray(y.properties?.caption),
        };
      }
      case 'bulleted_list':
      case 'numbered_list':
      default:
        return {
          type: y.type,
          // @ts-ignore
          children: [{ properties: y?.properties }],
        };
    }
  });
};

const mapIntermediateContentRepresentation = (x: BlockType) => {
  return {
    ...x,
    content: x.content ? mapContent(x.content) : [],
  };
};

export type IntermediateForm = ReturnType<
  typeof mapIntermediateContentRepresentation
>;

export default mapIntermediateContentRepresentation;
