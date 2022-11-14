export const enum AggregateInterval {
  MINUTE = 60,
  FIVE_MINUTES = 30,
  FIFTEEN_MINUTES = 900,
  HOUR = 3600,
  DAY = 86400,
  // special cases, since bound to start of week/month
  WEEK = 'week',
  MONTH = 'month',
}

export type ItemChange<Item> =
  // updated
  | {prev: Item; next: Item}
  // created
  | {prev: null; next: Item}
  // removed
  | {prev: Item; next: null};

export const isItemChange = <Item>(value: {
  prev: Item | null;
  next: Item | null;
}): value is ItemChange<Item> => {
  const {prev, next} = value;

  return prev !== null || next !== null;
};
