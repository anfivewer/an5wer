// keys are log lines
// (normalized by moving timestamp in the line start),
// value is empty
export const LOG_LINES_COLLECTION_NAME = 'log-lines';

// keys are `<timestamp> <first part of log key (before first ":")>`
// values are ParsedLogLine
export const PARSED_LINES_COLLECTION_NAME = 'parsed-log-lines';

export const PARSED_LINES_LOG_LINES_READER_NAME = 'log-lines';

type CollectionReaderDef = {
  name: string;
  collectionName: string | undefined;
};
type CollectionDef = {
  name: string;
  isManual?: boolean;
  readers?: CollectionReaderDef[];
};

export const collections: CollectionDef[] = [
  {name: LOG_LINES_COLLECTION_NAME},
  {
    name: PARSED_LINES_COLLECTION_NAME,
    isManual: true,
    readers: [
      {
        name: PARSED_LINES_LOG_LINES_READER_NAME,
        collectionName: LOG_LINES_COLLECTION_NAME,
      },
    ],
  },
];
