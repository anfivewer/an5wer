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

export type CollectionsWithIntermediateDef = {
  sourceCollectionName: string;
  intermediateCollectionName: string;
  intermediateToSourceReaderName: string;
  targetCollectionName: string;
  targetToIntermediateReaderName: string;
};

const makeCollectionsWithIntermediate = ({
  sourceCollectionName,
  intermediateCollectionName,
  targetCollectionName,
}: {
  sourceCollectionName: string;
  intermediateCollectionName: string;
  targetCollectionName: string;
}): CollectionsWithIntermediateDef & {
  collections: CollectionsStructure;
} => {
  return {
    sourceCollectionName,
    intermediateCollectionName,
    intermediateToSourceReaderName: sourceCollectionName,
    targetCollectionName,
    targetToIntermediateReaderName: intermediateCollectionName,
    collections: [
      {
        name: intermediateCollectionName,
        isManual: true,
        readers: [
          {
            name: sourceCollectionName,
            collectionName: sourceCollectionName,
          },
        ],
      },
      {
        name: targetCollectionName,
        isManual: true,
        readers: [
          {
            name: intermediateCollectionName,
            collectionName: intermediateCollectionName,
          },
        ],
      },
    ],
  };
};

const {
  intermediateCollectionName: HANDLE_UPDATE_PER_DAY_COLLECTION_NAME,
  intermediateToSourceReaderName:
    HANDLE_UPDATE_PER_DAY_PARSED_LINES_READER_NAME,
  targetCollectionName: HANDLE_UPDATE_PER_DAY_PERCENTILES_COLLECTION_NAME,
  targetToIntermediateReaderName: HANDLE_UPDATE_PER_DAY_PERCENTILES_READER_NAME,
  collections: updateHandleCollections,
} = makeCollectionsWithIntermediate({
  sourceCollectionName: PARSED_LINES_COLLECTION_NAME,
  intermediateCollectionName: 'updateMs:1d:intermediate',
  targetCollectionName: 'updateMs:1d:p',
});

export {
  HANDLE_UPDATE_PER_DAY_COLLECTION_NAME,
  HANDLE_UPDATE_PER_DAY_PARSED_LINES_READER_NAME,
  HANDLE_UPDATE_PER_DAY_PERCENTILES_COLLECTION_NAME,
  HANDLE_UPDATE_PER_DAY_PERCENTILES_READER_NAME,
};

export const UNIQUE_CHATS_COLLECTIONS_DEF = makeCollectionsWithIntermediate({
  sourceCollectionName: PARSED_LINES_COLLECTION_NAME,
  intermediateCollectionName: 'uniqueChats:1d:intermediate',
  targetCollectionName: 'uniqueChats:1d',
});

export const UNIQUE_USERS_COLLECTIONS_DEF = makeCollectionsWithIntermediate({
  sourceCollectionName: PARSED_LINES_COLLECTION_NAME,
  intermediateCollectionName: 'uniqueUsers:1d:intermediate',
  targetCollectionName: 'uniqueUsers:1d',
});

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
  ...updateHandleCollections,
  ...UNIQUE_CHATS_COLLECTIONS_DEF.collections,
  ...UNIQUE_USERS_COLLECTIONS_DEF.collections,
];
