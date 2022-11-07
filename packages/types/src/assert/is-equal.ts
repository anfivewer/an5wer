export type IsEqual<A, B> = {value: A} extends {value: B}
  ? {value: B} extends {value: A}
    ? true
    : never
  : never;

export type IsNotEqual<A, B> = {value: A} extends {value: B}
  ? {value: B} extends {value: A}
    ? never
    : true
  : true;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const assertTypesEqual = <A, B>(proof: IsEqual<A, B>): void => {
  //
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const assertTypesNotEqual = <A, B>(proof: IsNotEqual<A, B>): void => {
  //
};
