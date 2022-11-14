export const increment = (
  record: Record<string, number | undefined>,
  key: string,
  amount = 1,
): void => {
  let count = record[key];

  if (typeof count === 'number') {
    count += amount;
  } else {
    count = amount;
  }

  record[key] = count;
};

export const decrement = (
  record: Record<string, number | undefined>,
  key: string,
): void => {
  let count = record[key];

  if (typeof count === 'number') {
    count -= 1;
  } else {
    count = -1;
  }

  record[key] = count;
};
