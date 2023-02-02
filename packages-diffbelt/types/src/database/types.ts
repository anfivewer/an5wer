import {ReadOnlyStream} from '@-/types/src/stream/stream';
import {zodEnum, ZodInfer} from '@-/types/src/zod/zod';
import {array, boolean, object, string, union, number} from 'zod';

const EncodingTypeEnum = zodEnum(['utf8', 'base64']);
export const EncodingType = EncodingTypeEnum.enum;
export type EncodingType = ZodInfer<typeof EncodingTypeEnum>;

export const KeyValueUpdate = object({
  key: string(),
  keyEncoding: EncodingTypeEnum.optional(),
  ifNotPresent: boolean().optional(),
  value: string().nullable(),
  valueEncoding: EncodingTypeEnum.optional(),
});
export type KeyValueUpdate = ZodInfer<typeof KeyValueUpdate>;

export const KeyValue = object({
  key: string(),
  keyEncoding: EncodingTypeEnum.optional(),
  value: string(),
  valueEncoding: EncodingTypeEnum.optional(),
});
export type KeyValue = ZodInfer<typeof KeyValue>;

export const PutResult = object({
  generationId: string(),
  generationIdEncoding: EncodingTypeEnum.optional(),
  wasPut: boolean().optional(),
});
export type PutResult = ZodInfer<typeof PutResult>;

export type KeyValueRecord = {
  key: string;
  keyEncoding: EncodingType | undefined;
  value: string | null;
  valueEncoding: EncodingType | undefined;
  generationId: string;
  phantomId: string | undefined;
};

export const QueryResult = object({
  generationId: string(),
  generationIdEncoding: EncodingTypeEnum.optional(),
  items: array(KeyValue),
  cursorId: string().optional(),
});
export type QueryResult = ZodInfer<typeof QueryResult>;

export const DiffResultValues = array(string().nullable());
export type DiffResultValues = ZodInfer<typeof DiffResultValues>;

export const DiffResultItems = array(
  object({
    key: string(),
    keyEncoding: EncodingTypeEnum.optional(),
    values: DiffResultValues,
  }),
);
export type DiffResultItems = ZodInfer<typeof DiffResultItems>;

export const DiffResult = object({
  fromGenerationId: string().nullable(),
  fromGenerationIdEncoding: EncodingTypeEnum.optional(),
  generationId: string(),
  generationIdEncoding: EncodingTypeEnum.optional(),
  items: DiffResultItems,
  cursorId: string().optional(),
});
export type DiffResult = ZodInfer<typeof DiffResult>;

export const DiffOptionsFromGenerationInputProvided = object({
  fromGenerationId: string(),
  fromGenerationIdEncoding: EncodingTypeEnum.optional(),
});
export type DiffOptionsFromGenerationInputProvided = ZodInfer<
  typeof DiffOptionsFromGenerationInputProvided
>;

export const DiffOptionsFromGenerationInputFromReader = object({
  readerId: string(),
  readerCollectionName: string().optional(),
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
    (value as Partial<DiffOptionsFromGenerationInputFromReader>).readerId,
  );
};

export const DiffOptions = DiffOptionsFromGenerationInput.and(
  object({
    toGenerationId: string().optional(),
    toGenerationIdEncoding: EncodingTypeEnum.optional(),
  }),
);
export type DiffOptions = ZodInfer<typeof DiffOptions>;

export const CollectionGetKeysAroundOptions = object({
  key: string(),
  keyEncoding: EncodingTypeEnum.optional(),
  requireKeyExistance: boolean(),
  limit: number(),
  generationId: string().optional(),
  generationIdEncoding: EncodingTypeEnum.optional(),
  phantomId: string().optional(),
  phantomIdEncoding: EncodingTypeEnum.optional(),
});
export type CollectionGetKeysAroundOptions = ZodInfer<
  typeof CollectionGetKeysAroundOptions
>;

export const EncodedKey = object({
  key: string(),
  keyEncoding: EncodingTypeEnum.optional(),
});
export type EncodedKey = ZodInfer<typeof EncodedKey>;

export const CollectionGetKeysAroundResult = object({
  generationId: string(),
  generationIdEncoding: EncodingTypeEnum.optional(),
  hasMoreOnTheLeft: boolean(),
  hasMoreOnTheRight: boolean(),
  left: array(EncodedKey),
  right: array(EncodedKey),
  foundKey: boolean(),
});
export type CollectionGetKeysAroundResult = ZodInfer<
  typeof CollectionGetKeysAroundResult
>;

export const GetOptions = object({
  key: string(),
  keyEncoding: EncodingTypeEnum.optional(),
  generationId: string().optional(),
  generationIdEncoding: EncodingTypeEnum.optional(),
  phantomId: string().optional(),
  phantomIdEncoding: EncodingTypeEnum.optional(),
});
export type GetOptions = ZodInfer<typeof GetOptions>;

export const GetResult = object({
  generationId: string(),
  generationIdEncoding: EncodingTypeEnum.optional(),
  item: KeyValue.nullable(),
});
export type GetResult = ZodInfer<typeof GetResult>;

export const QueryOptions = object({
  generationId: string().optional(),
  generationIdEncoding: EncodingTypeEnum.optional(),
  phantomId: string().optional(),
  phantomIdEncoding: EncodingTypeEnum.optional(),
});
export type QueryOptions = ZodInfer<typeof QueryOptions>;

export const ReadQueryCursorOptions = object({
  cursorId: string(),
});
export type ReadQueryCursorOptions = ZodInfer<typeof ReadQueryCursorOptions>;

export const PutOptions = KeyValueUpdate.and(
  object({
    generationId: string().optional(),
    generationIdEncoding: EncodingTypeEnum.optional(),
    phantomId: string().optional(),
    phantomIdEncoding: EncodingTypeEnum.optional(),
  }),
);
export type PutOptions = ZodInfer<typeof PutOptions>;

export const PutManyOptions = object({
  items: array(KeyValueUpdate),
  generationId: string().optional(),
  generationIdEncoding: EncodingTypeEnum.optional(),
  phantomId: string().optional(),
  phantomIdEncoding: EncodingTypeEnum.optional(),
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
      generationId: string().nullable(),
      generationIdEncoding: EncodingTypeEnum.optional(),
      collectionName: string().optional(),
    }),
  ),
});
export type ListReadersResult = ZodInfer<typeof ListReadersResult>;

export const CreateReaderOptions = object({
  readerId: string(),
  generationId: string().nullable(),
  generationIdEncoding: EncodingTypeEnum.optional(),
  collectionName: string().optional(),
});
export type CreateReaderOptions = ZodInfer<typeof CreateReaderOptions>;

export const UpdateReaderOptions = object({
  readerId: string(),
  generationId: string(),
  generationIdEncoding: EncodingTypeEnum.optional(),
});
export type UpdateReaderOptions = ZodInfer<typeof UpdateReaderOptions>;

export const DeleteReaderOptions = object({
  readerId: string(),
});
export type DeleteReaderOptions = ZodInfer<typeof DeleteReaderOptions>;

export const StartGenerationOptions = object({
  generationId: string(),
  generationIdEncoding: EncodingTypeEnum.optional(),
  abortOutdated: boolean().optional(),
});
export type StartGenerationOptions = ZodInfer<typeof StartGenerationOptions>;

export const CommitGenerationOptions = object({
  generationId: string(),
  generationIdEncoding: EncodingTypeEnum.optional(),
  updateReaders: array(
    object({
      readerId: string(),
      generationId: string(),
      generationIdEncoding: EncodingTypeEnum.optional(),
    }),
  ).optional(),
});
export type CommitGenerationOptions = ZodInfer<typeof CommitGenerationOptions>;

export const AbortGenerationOptions = object({
  generationId: string(),
  generationIdEncoding: EncodingTypeEnum.optional(),
});
export type AbortGenerationOptions = ZodInfer<typeof AbortGenerationOptions>;

export const StartPhantomResult = object({
  phantomId: string(),
  phantomIdEncoding: EncodingTypeEnum.optional(),
});
export type StartPhantomResult = ZodInfer<typeof StartPhantomResult>;

export const DropPhantomOptions = object({
  phantomId: string(),
  phantomIdEncoding: EncodingTypeEnum.optional(),
});
export type DropPhantomOptions = ZodInfer<typeof DropPhantomOptions>;

export const CreateCollectionOptions = object({
  name: string(),
  generationId: string().optional(),
  generationIdEncoding: EncodingTypeEnum.optional(),
});
export type CreateCollectionOptions = ZodInfer<typeof CreateCollectionOptions>;

export const CreateCollectionResult = object({
  generationId: string().optional(),
  generationIdEncoding: EncodingTypeEnum.optional(),
});
export type CreateCollectionResult = ZodInfer<typeof CreateCollectionResult>;

export const ListCollectionsResult = object({
  collections: array(string()),
});
export type ListCollectionsResult = ZodInfer<typeof ListCollectionsResult>;

export type Collection = {
  getName: () => string;
  isManual: () => boolean;

  getGeneration: () => Promise<string>;
  getGenerationStream: () => ReadOnlyStream<string>;
  getPlannedGeneration: () => Promise<string | null>;

  get: (options: GetOptions) => Promise<GetResult>;
  getKeysAround: (
    options: CollectionGetKeysAroundOptions,
  ) => Promise<CollectionGetKeysAroundResult>;
  query: (options?: QueryOptions) => Promise<QueryResult>;
  readQueryCursor: (options: {cursorId: string}) => Promise<QueryResult>;

  put: (options: PutOptions) => Promise<PutResult>;
  putMany: (options: PutManyOptions) => Promise<PutResult>;
  diff: (options: DiffOptions) => Promise<DiffResult>;
  readDiffCursor: (options: ReadDiffCursorOptions) => Promise<DiffResult>;

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
