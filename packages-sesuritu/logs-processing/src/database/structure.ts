// keys are log lines
// (normalized by moving timestamp in the line start),
// value is empty
export const LOG_LINES_COLLECTION_NAME = 'log-lines';

// keys are `<timestamp> <first part of log key (before first ":")>`
// values are
export const PARSED_LINES_COLLECTION_NAME = 'parsed-log-lines';

export const collections = [LOG_LINES_COLLECTION_NAME];
