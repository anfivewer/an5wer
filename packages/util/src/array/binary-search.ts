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

export function* binarySearchIterator({
  fromIndexInclusive,
  toIndexExclusive,
  returnInsertPos = false,
}: {
  fromIndexInclusive: number;
  toIndexExclusive: number;
  returnInsertPos?: boolean;
}): Generator<
  number,
  number,
  | number
  | {
      comparison: number;
      hintLeftInclusive?: number;
      hintRightInclusive?: number;
    }
> {
  let left = fromIndexInclusive;
  let right = toIndexExclusive - 1;
  let pos = 0;
  let comparison = 0;

  while (left <= right) {
    pos = left === right ? left : left + Math.floor((right - left) / 2);

    let leftHinted = false;
    let rightHinted = false;

    const result = yield pos;

    if (typeof result === 'number') {
      comparison = result;
    } else {
      const {
        comparison: resultComparison,
        hintLeftInclusive,
        hintRightInclusive,
      } = result;

      comparison = resultComparison;

      if (typeof hintLeftInclusive === 'number') {
        leftHinted = true;
        left = hintLeftInclusive;
      }
      if (typeof hintRightInclusive === 'number') {
        rightHinted = true;
        right = hintRightInclusive;
      }
    }

    if (comparison === 0) {
      return pos;
    }

    if (comparison < 0) {
      if (!rightHinted) {
        right = pos - 1;
      }
    } else {
      if (!leftHinted) {
        left = pos + 1;
      }
    }
  }

  if (!returnInsertPos) {
    return -1;
  }

  if (comparison > 0) {
    return pos + 1;
  }

  return pos;
}
