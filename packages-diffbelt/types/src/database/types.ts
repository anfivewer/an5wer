import {FinishableStream} from '@-/types/src/stream/stream';
import {zodEnum, ZodInfer} from '@-/types/src/zod/zod';
import {array, boolean, object, string, union, number} from 'zod';

export const EncodingTypeEnum = zodEnum(['utf8', 'base64']);
export const EncodingType = EncodingTypeEnum.enum;
export type EncodingType = ZodInfer<typeof EncodingTypeEnum>;

export const EncodedValue = object({
  value: string(),
  encoding: EncodingTypeEnum.optional(),
});
export type EncodedValue = ZodInfer<typeof EncodedValue>;

export const KeyValueUpdate = object({
  key: EncodedValue,
  ifNotPresent: boolean().optional(),
  value: EncodedValue.nullable(),
});
export type KeyValueUpdate = ZodInfer<typeof KeyValueUpdate>;

export const KeyValue = object({
  key: EncodedValue,
  value: EncodedValue,
});
export type KeyValue = ZodInfer<typeof KeyValue>;

export const GetGenerationIdResult = object({
  generationId: EncodedValue,
});
export type GetGenerationIdResult = ZodInfer<typeof GetGenerationIdResult>;

export const GetNextGenerationIdResult = object({
  nextGenerationId: EncodedValue.nullable(),
});
export type GetNextGenerationIdResult = ZodInfer<
  typeof GetNextGenerationIdResult
>;

export const PutResult = object({
  generationId: EncodedValue,
  wasPut: boolean().optional(),
});
export type PutResult = ZodInfer<typeof PutResult>;

export type KeyValueRecord = {
  key: EncodedValue;
  value: EncodedValue | null;
  generationId: EncodedValue;
  phantomId: EncodedValue | undefined;
};

export const QueryResult = object({
  generationId: EncodedValue,
  items: array(KeyValue),
  cursorId: string().optional(),
});
export type QueryResult = ZodInfer<typeof QueryResult>;

export const DiffResultItems = array(
  object({
    key: EncodedValue,
    fromValue: EncodedValue.nullable(),
    intermediateValues: array(EncodedValue.nullable()),
    toValue: EncodedValue.nullable(),
  }),
);
export type DiffResultItems = ZodInfer<typeof DiffResultItems>;

export const DiffResult = object({
  fromGenerationId: EncodedValue,
  toGenerationId: EncodedValue,
  items: DiffResultItems,
  cursorId: string().optional(),
});
export type DiffResult = ZodInfer<typeof DiffResult>;

export const DiffOptionsFromGenerationInputProvided = object({
  fromGenerationId: EncodedValue,
});
export type DiffOptionsFromGenerationInputProvided = ZodInfer<
  typeof DiffOptionsFromGenerationInputProvided
>;

export const DiffOptionsFromGenerationInputFromReader = object({
  fromReader: object({
    readerId: string(),
    collectionName: string().optional(),
  }),
});
export type DiffOptionsFromGenerationInputFromReader = ZodInfer<
  typeof DiffOptionsFromGenerationInputFromReader
>;

export const DiffOptionsFromGenerationInput = union([
  DiffOptionsFromGenerationInputProvided,
  DiffOptionsFromGenerationInputFromReader,
]);
export type DiffOptionsFromGenerationInput = ZodInfer<
  typeof DiffOptionsFromGenerationInput
>;

export const isGenerationProvidedByReader = (
  value: DiffOptionsFromGenerationInput,
): value is DiffOptionsFromGenerationInputFromReader => {
  return Boolean(
    (value as Partial<DiffOptionsFromGenerationInputFromReader>).fromReader,
  );
};

export const DiffOptions = DiffOptionsFromGenerationInput.and(
  object({
    toGenerationId: EncodedValue.optional(),
  }),
);
export type DiffOptions = ZodInfer<typeof DiffOptions>;

export const CollectionGetKeysAroundOptions = object({
  key: EncodedValue,
  requireKeyExistance: boolean(),
  limit: number(),
  generationId: EncodedValue.optional(),
  phantomId: EncodedValue.optional(),
});
export type CollectionGetKeysAroundOptions = ZodInfer<
  typeof CollectionGetKeysAroundOptions
>;

export const CollectionGetKeysAroundResult = object({
  generationId: EncodedValue,
  hasMoreOnTheLeft: boolean(),
  hasMoreOnTheRight: boolean(),
  left: array(EncodedValue),
  right: array(EncodedValue),
  foundKey: boolean(),
});
export type CollectionGetKeysAroundResult = ZodInfer<
  typeof CollectionGetKeysAroundResult
>;

export const GetOptions = object({
  key: EncodedValue,
  generationId: EncodedValue.optional(),
  phantomId: EncodedValue.optional(),
});
export type GetOptions = ZodInfer<typeof GetOptions>;

export const GetResult = object({
  generationId: EncodedValue,
  item: KeyValue.nullable(),
});
export type GetResult = ZodInfer<typeof GetResult>;

export const QueryOptions = object({
  generationId: EncodedValue.optional(),
  phantomId: EncodedValue.optional(),
});
export type QueryOptions = ZodInfer<typeof QueryOptions>;

export const ReadQueryCursorOptions = object({
  cursorId: string(),
});
export type ReadQueryCursorOptions = ZodInfer<typeof ReadQueryCursorOptions>;

export const PutOptions = object({
  item: KeyValueUpdate,
  generationId: EncodedValue.optional(),
  phantomId: EncodedValue.optional(),
});
export type PutOptions = ZodInfer<typeof PutOptions>;

export const PutManyOptions = object({
  items: array(KeyValueUpdate),
  generationId: EncodedValue.optional(),
  phantomId: EncodedValue.optional(),
});
export type PutManyOptions = ZodInfer<typeof PutManyOptions>;

export const ReadDiffCursorOptions = object({
  cursorId: string(),
});
export type ReadDiffCursorOptions = ZodInfer<typeof ReadDiffCursorOptions>;

export const CloseCursorOptions = object({
  cursorId: string(),
});
export type CloseCursorOptions = ZodInfer<typeof CloseCursorOptions>;

export const ListReadersResult = object({
  items: array(
    object({
      readerId: string(),
      generationId: EncodedValue.nullable(),
      collectionName: string().optional(),
    }),
  ),
});
export type ListReadersResult = ZodInfer<typeof ListReadersResult>;

export const CreateReaderOptions = object({
  readerId: string(),
  generationId: EncodedValue.nullable(),
  collectionName: string().optional(),
});
export type CreateReaderOptions = ZodInfer<typeof CreateReaderOptions>;

export const UpdateReaderOptions = object({
  readerId: string(),
  generationId: EncodedValue,
});
export type UpdateReaderOptions = ZodInfer<typeof UpdateReaderOptions>;

export const DeleteReaderOptions = object({
  readerId: string(),
});
export type DeleteReaderOptions = ZodInfer<typeof DeleteReaderOptions>;

export const StartGenerationOptions = object({
  generationId: EncodedValue,
  abortOutdated: boolean().optional(),
});
export type StartGenerationOptions = ZodInfer<typeof StartGenerationOptions>;

export const CommitGenerationOptions = object({
  generationId: EncodedValue,
  updateReaders: array(
    object({
      readerId: string(),
      generationId: EncodedValue,
    }),
  ).optional(),
});
export type CommitGenerationOptions = ZodInfer<typeof CommitGenerationOptions>;

export const AbortGenerationOptions = object({
  generationId: EncodedValue,
});
export type AbortGenerationOptions = ZodInfer<typeof AbortGenerationOptions>;

export const StartPhantomResult = object({
  phantomId: EncodedValue,
});
export type StartPhantomResult = ZodInfer<typeof StartPhantomResult>;

export const DropPhantomOptions = object({
  phantomId: EncodedValue,
});
export type DropPhantomOptions = ZodInfer<typeof DropPhantomOptions>;

export const CreateCollectionOptions = object({
  name: string(),
  generationId: EncodedValue.optional(),
});
export type CreateCollectionOptions = ZodInfer<typeof CreateCollectionOptions>;

export const CreateCollectionResult = object({
  generationId: EncodedValue.optional(),
});
export type CreateCollectionResult = ZodInfer<typeof CreateCollectionResult>;

export const ListCollectionsResult = object({
  collections: array(string()),
});
export type ListCollectionsResult = ZodInfer<typeof ListCollectionsResult>;

export type Collection = {
  getName: () => string;
  isManual: () => boolean;

  getGeneration: () => Promise<GetGenerationIdResult>;
  getGenerationStream: () => FinishableStream<GetGenerationIdResult>;
  getPlannedGeneration: () => Promise<GetNextGenerationIdResult>;

  get: (options: GetOptions) => Promise<GetResult>;
  getKeysAround: (
    options: CollectionGetKeysAroundOptions,
  ) => Promise<CollectionGetKeysAroundResult>;
  query: (options?: QueryOptions) => Promise<QueryResult>;
  readQueryCursor: (options: ReadQueryCursorOptions) => Promise<QueryResult>;

  put: (options: PutOptions) => Promise<PutResult>;
  putMany: (options: PutManyOptions) => Promise<PutResult>;
  diff: (options: DiffOptions) => Promise<DiffResult>;
  readDiffCursor: (options: ReadDiffCursorOptions) => Promise<DiffResult>;

  // FIXME: split to closeQueryCursor/closeDiffCursor
  closeCursor: (options: CloseCursorOptions) => Promise<void>;

  listReaders: () => Promise<ListReadersResult>;
  createReader: (options: CreateReaderOptions) => Promise<void>;
  updateReader: (options: UpdateReaderOptions) => Promise<void>;
  deleteReader: (options: DeleteReaderOptions) => Promise<void>;

  startGeneration: (options: StartGenerationOptions) => Promise<void>;
  commitGeneration: (options: CommitGenerationOptions) => Promise<void>;
  abortGeneration: (options: AbortGenerationOptions) => Promise<void>;

  startPhantom: () => Promise<StartPhantomResult>;
  dropPhantom: (options: DropPhantomOptions) => Promise<void>;
};

export type Database = {
  createCollection: (
    options: CreateCollectionOptions,
  ) => Promise<CreateCollectionResult>;
  getCollection: (name: string) => Promise<Collection>;
  listCollections: () => Promise<ListCollectionsResult>;
  deleteCollection: (name: string) => Promise<void>;
};
