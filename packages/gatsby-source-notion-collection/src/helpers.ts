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

export const NOTION_NODE_PREFIX = 'NotionCollection';

export const isNotionNode = (node: any) => {
  return node.internal.type.startsWith(NOTION_NODE_PREFIX);
};

// A simple helper to try to help avoid spamming notion's api with tons of requests at once
export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
