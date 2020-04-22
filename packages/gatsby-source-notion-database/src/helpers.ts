// @ts-ignore
export const pipe = (...fns) =>
  fns.reduce((f, g) => (...args) => g(f(...args)));
// @ts-ignore
export const map = (fn) => (xs) => xs.map(fn);
export const join = (char: string) => (arr: any[]) => arr.join(char);
