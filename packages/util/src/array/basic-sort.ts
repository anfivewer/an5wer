export const basicCompare = <T extends string | number>(a: T, b: T) =>
  a < b ? -1 : a > b ? 1 : 0;
