import {ReadOnlyStream} from '@-/types/src/stream/stream';

export type KeyValueUpdate = {
  key: string;
  value: string | null;
  phantomId?: string;
  ifNotPresent?: boolean;
};
export type KeyValue = {key: string; value: string};
type PutResult = {generationId: string};

export type KeyValueRecord = {
  key: string;
  value: string | null;
  generationId: string;
  phantomId: string | undefined;
};

export type QueryResult = {
  generationId: string;
  items: KeyValue[];
  cursorId?: string;
};

export type DiffResultValues = (string | null)[];
export type DiffResultItems = {key: string; values: DiffResultValues}[];

export type DiffResult = {
  fromGenerationId: string | null;
  generationId: string;
  items: DiffResultItems;
  cursorId?: string;
};

type DiffOptionsFromGenerationInputProvided = {fromGenerationId: string};
type DiffOptionsFromGenerationInputFromReader = {
  readerId: string;
  readerCollectionName: string | undefined;
};
type DiffOptionsFromGenerationInput =
  | DiffOptionsFromGenerationInputProvided
  | DiffOptionsFromGenerationInputFromReader;

export const isGenerationProvidedByReader = (
  value: DiffOptionsFromGenerationInput,
): value is DiffOptionsFromGenerationInputFromReader => {
  return Boolean(
    (value as Partial<DiffOptionsFromGenerationInputFromReader>).readerId,
  );
};

export type DiffOptions = DiffOptionsFromGenerationInput & {
  toGenerationId?: string;
};

export type CollectionGetKeysAroundOptions = {
  key: string;
  requireKeyExistance: boolean;
  limit: number;
  generationId?: string;
  phantomId?: string;
};

export type CollectionGetKeysAroundResult = {
  generationId: string;
  hasMoreOnTheLeft: boolean;
  hasMoreOnTheRight: boolean;
  left: string[];
  right: string[];
  foundKey: boolean;
};

export type Collection = {
  getName: () => string;
  isManual: () => boolean;

  getGeneration: () => Promise<string>;
  getGenerationStream: () => ReadOnlyStream<string>;
  getPlannedGeneration: () => Promise<string | null>;

  get: (options: {
    key: string;
    generationId?: string;
    phantomId?: string;
  }) => Promise<{generationId: string; item: KeyValue | null}>;
  getKeysAround: (
    options: CollectionGetKeysAroundOptions,
  ) => Promise<CollectionGetKeysAroundResult>;
  query: (options?: {
    generationId?: string;
    phantomId?: string;
  }) => Promise<QueryResult>;
  readQueryCursor: (options: {cursorId: string}) => Promise<QueryResult>;

  put: (
    options: KeyValueUpdate & {
      generationId?: string;
      phantomId?: string;
    },
  ) => Promise<PutResult>;
  putMany: (options: {
    items: KeyValueUpdate[];
    generationId?: string;
  }) => Promise<PutResult>;
  diff: (options: DiffOptions) => Promise<DiffResult>;
  readDiffCursor: (options: {cursorId: string}) => Promise<DiffResult>;

  closeCursor: (options: {cursorId: string}) => Promise<void>;

  listReaders: () => Promise<
    {
      readerId: string;
      generationId: string | null;
      collectionName: string | undefined;
    }[]
  >;
  createReader: (options: {
    readerId: string;
    generationId: string | null;
    collectionName: string | undefined;
  }) => Promise<void>;
  updateReader: (options: {
    readerId: string;
    generationId: string;
  }) => Promise<void>;
  deleteReader: (options: {readerId: string}) => Promise<void>;

  startGeneration: (options: {
    generationId: string;
    abortOutdated?: boolean;
  }) => Promise<void>;
  commitGeneration: (options: {
    generationId: string;
    updateReaders?: {
      readerId: string;
      generationId: string;
    }[];
  }) => Promise<void>;
  abortGeneration: (options: {generationId: string}) => Promise<void>;

  startPhantom: () => Promise<{phantomId: string}>;
  dropPhantom: (options: {phantomId: string}) => Promise<void>;
};

export type Database = {
  createCollection: (
    name: string,
    options?: {generationId?: string},
  ) => Promise<{generationId: string}>;
  getCollection: (name: string) => Promise<Collection>;
  listCollections: () => Promise<{collections: string[]}>;
  deleteCollection: (name: string) => Promise<void>;
};
