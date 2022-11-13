/** @deprecated */
export type StatsDistributionLogger = {
  collect: (value: number) => void;
  collectDuration: () => () => void;
  /** @deprecated TODO: hide this method */
  destroy: () => void;
};

/** @deprecated */
export type StatsUniqueLogger = {
  collect: (value: number | string) => void;
  /** @deprecated TODO: hide this method */
  destroy: () => void;
};
