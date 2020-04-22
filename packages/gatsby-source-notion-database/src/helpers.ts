// @ts-ignore
export const pipe = (...fns) =>
  fns.reduce((f, g) => (...args) => g(f(...args)));
// @ts-ignore
export const map = (fn) => (xs) => xs.map(fn);

export const tap = <T>(fn: (x: T) => void) => (x: T) => {
  fn(x);
  return x;
};
export const join = (char: string) => (arr: any[]) => arr.join(char);

export const NOTION_NODE_PREFIX = 'NotionCollectionNode';

export const isNotionNode = (node: any) => {
  return node.internal.type.startsWith(NOTION_NODE_PREFIX);
};
