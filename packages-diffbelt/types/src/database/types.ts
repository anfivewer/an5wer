import {ReadOnlyStream} from '@-/types/src/stream/stream';

type KeyValueUpdate = {key: string; value: string | null};
type KeyValue = {key: string; value: string};
type PutResult = {generationId: string};

type QueryResult = {
  generationId: string;
  items: KeyValue[];
  cursorId?: string;
};

export type DiffResultItems = {key: string; values: (string | null)[]}[];

type DiffResult = {
  fromGenerationId: string;
  generationId: string;
  items: DiffResultItems;
  cursorId?: string;
};

export type Collection = {
  getName: () => string;

  getGeneration: () => Promise<string>;
  getGenerationStream: () => ReadOnlyStream<string>;

  get: (options: {
    key: string;
    generationId?: string;
    transactionId?: string;
  }) => Promise<{generationId: string; item: KeyValue | null}>;
  query: (options?: {generationId?: string}) => Promise<QueryResult>;
  readQueryCursor: (options: {cursorId: string}) => Promise<QueryResult>;

  put: (
    options: KeyValueUpdate & {transactionId?: string; generationId?: string},
  ) => Promise<PutResult>;
  putMany: (options: {
    items: KeyValueUpdate[];
    transactionId?: string;
    generationId?: string;
  }) => Promise<PutResult>;
  diff: (
    options: ({fromGeneration: string} | {readerId: string}) & {
      toGeneration?: string;
    },
  ) => Promise<DiffResult>;
  readDiffCursor: (options: {cursorId: string}) => Promise<DiffResult>;

  closeCursor: (options: {cursorId: string}) => Promise<void>;

  createReader: (options: {id: string}) => Promise<{generationId: string}>;
  updateReader: (options: {id: string; generationId: string}) => Promise<void>;
  deleteReader: (options: {id: string}) => Promise<void>;

  startTransaction: () => Promise<{
    transactionId: string;
    generationId: string;
  }>;
  commitTransaction: (options: {
    transactionId: string;
  }) => Promise<{generationId: string}>;
  abortTransaction: (options: {transactionId: string}) => Promise<void>;

  startGeneration: (options: {generationId: string}) => Promise<void>;
  commitGeneration: (options: {
    generationId: string;
    updateReaders?: {
      collectionName: string;
      readerId: string;
      generationId: string;
    }[];
  }) => Promise<void>;
  abortGeneration: (options: {generationId: string}) => Promise<void>;
};

export type Database = {
  createCollection: (name: string) => Promise<void>;
  getCollection: (
    name: string,
    options?: {createIfAbsent?: boolean},
  ) => Promise<Collection>;
  listCollections: () => Promise<{collections: string[]}>;
};
