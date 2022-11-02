// keys are log lines
// (normalized by moving timestamp in the line start),
// value is empty
export const LOG_LINES_COLLECTION_NAME = 'log-lines';

// keys are `<timestamp> <first part of log key (before first ":")>`
// values are ParsedLogLine
export const PARSED_LINES_COLLECTION_NAME = 'parsed-log-lines';
export const PARSED_LINES_LOG_LINES_READER_NAME = 'log-lines';

// key is `parsed-log-lines` key,
// values are KicksCollectionItem
export const KICKS_COLLECTION_NAME = 'kicks';
export const KICKS_PARSED_LINES_READER_NAME = 'parsed-log-lines';

export const KICKS_PER_HOUR_COLLECTION_NAME = 'kicks:1h';
export const KICKS_PER_HOUR_KICKS_READER_NAME = 'kicks';

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
  {
    name: KICKS_COLLECTION_NAME,
    isManual: true,
    readers: [
      {
        name: KICKS_PARSED_LINES_READER_NAME,
        collectionName: PARSED_LINES_COLLECTION_NAME,
      },
    ],
  },
  {
    name: KICKS_PER_HOUR_COLLECTION_NAME,
    isManual: true,
    readers: [
      {
        name: KICKS_PER_HOUR_KICKS_READER_NAME,
        collectionName: KICKS_COLLECTION_NAME,
      },
    ],
  },
];
