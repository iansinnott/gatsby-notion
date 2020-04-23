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
    const attributes: ({ type: string, meta?: string })[] = !attrs ? [] : attrs.map(([typ, meta]) => ({ type: typ, meta }));
    return {
      type: 'inline',
      children: str,
      props: { attributes },
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

  return content.map((y) => {
    if (typeof y === 'string') {
      return y;
    }

    switch (y.type) {
      // @ts-ignore
      case 'inline':
        return y;

      case 'header':
      case 'sub_header':
      case 'sub_sub_header':
      case 'text': {
        const children = makeInlineChildren(y.properties?.title);
        // What does it mean when this is undefined? An empty line?
        return children
          ? { type: y.type, children }
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
              // @ts-ignore
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
