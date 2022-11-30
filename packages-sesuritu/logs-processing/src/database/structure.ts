import {CollectionsStructure} from '@-/diffbelt-util/src/database/initialize-structure';

// keys are log lines
// (normalized by moving timestamp in the line start),
// value is empty
export const LOG_LINES_COLLECTION_NAME = 'log-lines';

// keys are `<timestamp> <first part of log key (before first ":")>`
// values are ParsedLogLine
export const PARSED_LINES_COLLECTION_NAME = 'parsed-log-lines';
export const PARSED_LINES_LOG_LINES_READER_NAME = LOG_LINES_COLLECTION_NAME;

export const PARSED_LINES_PER_DAY_COLLECTION_NAME = 'parsed-log-lines:1d';
export const PARSED_LINES_PER_DAY_PARSED_LINES_READER_NAME =
  PARSED_LINES_COLLECTION_NAME;

// key is `parsed-log-lines` key,
// values are KicksCollectionItem
export const KICKS_COLLECTION_NAME = 'kicks';
export const KICKS_PARSED_LINES_READER_NAME = PARSED_LINES_COLLECTION_NAME;

export const KICKS_PER_HOUR_COLLECTION_NAME = 'kicks:1h';
export const KICKS_PER_HOUR_KICKS_READER_NAME = KICKS_COLLECTION_NAME;

export const KICKS_PER_DAY_COLLECTION_NAME = 'kicks:1d';
export const KICKS_PER_DAY_KICKS_READER_NAME = KICKS_PER_HOUR_COLLECTION_NAME;

export const HANDLE_UPDATE_PER_DAY_COLLECTION_NAME = 'updateMs:1d';
export const HANDLE_UPDATE_PER_DAY_PARSED_LINES_READER_NAME =
  PARSED_LINES_COLLECTION_NAME;
export const HANDLE_UPDATE_PER_DAY_PERCENTILES_COLLECTION_NAME =
  'updateMs:1d:p';
export const HANDLE_UPDATE_PER_DAY_PERCENTILES_READER_NAME =
  HANDLE_UPDATE_PER_DAY_COLLECTION_NAME;

export const collections: CollectionsStructure = [
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
    name: PARSED_LINES_PER_DAY_COLLECTION_NAME,
    isManual: true,
    readers: [
      {
        name: PARSED_LINES_PER_DAY_PARSED_LINES_READER_NAME,
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
  {
    name: KICKS_PER_DAY_COLLECTION_NAME,
    isManual: true,
    readers: [
      {
        name: KICKS_PER_DAY_KICKS_READER_NAME,
        collectionName: KICKS_PER_HOUR_COLLECTION_NAME,
      },
    ],
  },

  {
    name: HANDLE_UPDATE_PER_DAY_COLLECTION_NAME,
    isManual: true,
    readers: [
      {
        name: HANDLE_UPDATE_PER_DAY_PARSED_LINES_READER_NAME,
        collectionName: PARSED_LINES_COLLECTION_NAME,
      },
    ],
  },
  {
    name: HANDLE_UPDATE_PER_DAY_PERCENTILES_COLLECTION_NAME,
    isManual: true,
    readers: [
      {
        name: HANDLE_UPDATE_PER_DAY_PERCENTILES_READER_NAME,
        collectionName: HANDLE_UPDATE_PER_DAY_COLLECTION_NAME,
      },
    ],
  },
];
