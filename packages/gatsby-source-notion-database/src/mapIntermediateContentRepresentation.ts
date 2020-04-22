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

// These types were not working, but the real return type is basically an array of this
// export interface IntermediateForm {
//   type: string;
//   children: Array<ReturnType<typeof makeInlineChildren> | IntermediateForm>;
//   props?: { [k:string]: any }
// }

const mapContent = (
  content: Array<NotionContentBlock | string> | undefined,
) => {
  if (!content) {
    return [];
  }

  return (
    content
      // This silliness is just to get around some typing issues with the
      // recursion... We never want to call this with strings but the types imported
      // from elsewhere thing strings are what we get
      .filter(<T>(y: T | string): y is T => {
        return typeof y !== 'string';
      })
      .map((y) => {
        switch (y.type) {
          case 'header':
          case 'text': {
            const result = makeInlineChildren(y.properties?.title);
            // What does it mean when this is undefined? An empty line?
            return result
              ? { type: y.type, children: result }
              : { type: 'newline', children: [] };
          }
          // @ts-ignore Not an official type
          case 'newline':
            return { type: 'newline', children: [] };
          case 'code': {
            return {
              type: y.type,
              children: makeInlineChildren(y.properties?.title),
              props: {
                language: valueFromArray(y.properties?.language),
              },
            };
          }
          case 'image': {
            return {
              type: y.type,
              children: [],
              props: {
                // NOTE: The `source` property does indeed include an s3 image URL, but it's not accessible directly
                src: `https://www.notion.so/image/${encodeURIComponent(
                  valueFromArray(y.properties?.source),
                )}`,
                caption: makeInlineChildren(y.properties?.caption),
                captionString: valueFromArray(y.properties?.caption),
              },
            };
          }
          case 'bulleted_list':
          case 'numbered_list': {
            return {
              type: y.type,
              children: [
                ...makeInlineChildren(y.properties.title),
                ...mapContent(y.content),
              ],
            };
          }
          default:
            return {
              type: y.type,
              // @ts-ignore
              children: [{ properties: y?.properties }],
            };
        }
      })
  );
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
