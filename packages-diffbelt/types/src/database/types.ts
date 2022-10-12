import {ReadOnlyStream} from '@-/types/src/stream/stream';

type KeyValueUpdate = {key: string; value: string | null};
type KeyValue = {key: string; value: string};
type PutResult = {generationId: string};

type QueryResult = {
  generationId: string;
  items: KeyValue[];
  cursorId?: string;
};

type DiffResult = {
  generationId: string;
  items: {key: string; values: (string | null)[]}[];
  cursorId?: string;
};

export type Collection = {
  getGeneration: () => Promise<string>;
  getGenerationStream: () => ReadOnlyStream<string>;

  get: (options: {
    key: string;
    generationId?: string;
    transactionId?: string;
  }) => Promise<{generationId: string; item: KeyValue | null}>;
  query: (options: {generationId?: string}) => Promise<QueryResult>;
  readQueryCursor: (options: {cursorId: string}) => Promise<QueryResult>;

  put: (
    options: KeyValueUpdate & {transactionId?: string},
  ) => Promise<PutResult>;
  putMany: (options: {items: KeyValueUpdate[]}) => Promise<PutResult>;
  diff: (options: {
    fromGeneration: string;
    toGeneration?: string;
  }) => Promise<DiffResult>;
  readDiffCursor: (options: {cursorId: string}) => Promise<DiffResult>;

  closeCursor: (options: {cursorId: string}) => Promise<void>;

  createReader: (options: {id: string}) => Promise<{generationId: string}>;
  updateReader: (options: {id: string; generationId: string}) => Promise<void>;
  deleteReader: (options: {id: string}) => Promise<void>;

  startTransaction: () => Promise<{
    transactionId: string;
    generationId: string;
  }>;
  commitTransaction: (options: {transactionId: string}) => Promise<void>;
};

export type Database = {
  createCollection: (name: string) => Promise<void>;
  getCollection: (
    name: string,
    options?: {createIfAbsent?: boolean},
  ) => Promise<Collection>;
  listCollections: () => Promise<{collections: string[]}>;
};
