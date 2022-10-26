export const binarySearch = <T>({
  sortedArray,
  comparator,
  returnInsertPos = false,
}: {
  sortedArray: T[];
  comparator: (item: T) => number;
  returnInsertPos?: boolean;
}): number => {
  let left = 0;
  let right = sortedArray.length - 1;
  let pos = 0;
  let comparison = 0;

  while (left <= right) {
    pos = left === right ? left : left + Math.floor((right - left) / 2);

    const item = sortedArray[pos];

    comparison = comparator(item);

    if (comparison === 0) {
      return pos;
    }

    if (comparison < 0) {
      right = pos - 1;
    } else {
      left = pos + 1;
    }
  }

  if (!returnInsertPos) {
    return -1;
  }

  if (comparison > 0) {
    return pos + 1;
  }

  return pos;
};
