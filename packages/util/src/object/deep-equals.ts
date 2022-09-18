export const deepEquals = (
  a: unknown,
  b: unknown,
  {noLoops = false}: {noLoops?: boolean} = {},
): boolean => {
  const traversed = noLoops ? null : new Set();

  const isEquals = (a: unknown, b: unknown): boolean => {
    if (a === b) {
      return true;
    }

    if (!a || !b) {
      return false;
    }

    if (typeof a !== typeof b) {
      return false;
    }

    if (typeof a === 'object') {
      if (traversed) {
        if (traversed.has(a) || traversed.has(b)) {
          return false;
        }

        traversed.add(a);
        traversed.add(b);
      }

      if (Array.isArray(a)) {
        const bArray = b as Array<unknown>;
        if (a.length !== bArray.length) {
          return false;
        }

        return a.every((x, i) => isEquals(x, bArray[i]));
      }

      const aObject = a as Record<string, unknown>;
      const bObject = b as Record<string, unknown>;

      const checkedKeys = new Set<string>();

      for (const [key, valueA] of Object.entries(aObject)) {
        const valueB = bObject[key];

        if (!isEquals(valueA, valueB)) {
          return false;
        }

        checkedKeys.add(key);
      }

      for (const [key, valueB] of Object.entries(bObject)) {
        if (checkedKeys.has(key)) {
          continue;
        }

        const valueA = aObject[key];

        if (!isEquals(valueA, valueB)) {
          return false;
        }
      }

      return true;
    }

    return false;
  };

  return isEquals(a, b);
};
