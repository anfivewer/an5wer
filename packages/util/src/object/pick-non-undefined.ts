type PickNonUndefined<Type> = {
  [Property in keyof Type as Exclude<
    Property,
    undefined extends Type[Property] ? Property : never
  >]: Type[Property];
};

export const pickNonUndefined = <T extends Record<string, unknown>>(
  obj: T,
): PickNonUndefined<T> => {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'undefined') {
      continue;
    }

    result[key] = value;
  }

  // @ts-ignore
  return result;
};
