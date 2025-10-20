import {
  array,
  boolean,
  literal,
  looseObject,
  number,
  object,
  record,
  string,
  ZodInfer,
  ZodType,
} from '@-/types/src/zod';

export const ChunkId = string().brand('PersistChunkId');
export type ChunkId = ZodInfer<typeof ChunkId>;

export const TodoId = string().brand('PersistTodoId');
export type TodoId = ZodInfer<typeof TodoId>;

export const ClientId = string().brand('PersistClientId');
export type ClientId = ZodInfer<typeof ClientId>;

export const UnixtimeSeconds = number().brand('PersistUnixtimeSeconds');
export type UnixtimeSeconds = ZodInfer<typeof UnixtimeSeconds>;

export const Day = string().brand('PersistDay');
export type Day = ZodInfer<typeof Day>;

export const PersistChunkMetadata = object({
  version: literal(1),
  id: ChunkId,
  parentIds: array(string()),
  clientId: ClientId,
});
export type PersistChunkMetadata = ZodInfer<typeof PersistChunkMetadata>;

const persistChange = <T extends ZodType>(value: T) =>
  object({
    counter: number(),
    value,
  });

const persistChangeSet = <T extends ZodType>(value: T) =>
  object({
    add: array(persistChange(value)),
    remove: array(persistChange(value)),
  });

export const TodoNextVersionFields = looseObject(
  object({
    //
  }).partial(),
);
export type TodoNextVersionFields = ZodInfer<typeof TodoNextVersionFields>;

export const PersistTodoValues = object({
  title: persistChange(string()),
  estimateDuration: persistChange(string()),
  isCompleted: persistChange(boolean()),
  tags: persistChangeSet(string()),
  startFrom: persistChange(UnixtimeSeconds.optional()),

  nextVersionFields: TodoNextVersionFields,
});
export type PersistTodoValues = ZodInfer<typeof PersistTodoValues>;

export const PersistTodoChange = PersistTodoValues.partial().extend({
  clientId: string(),
  unixtime: UnixtimeSeconds,
});
export type PersistTodoChange = ZodInfer<typeof PersistTodoChange>;

export const PersistTodoBase = object({
  version: literal(1),
  id: TodoId,
}).extend(PersistTodoValues);
export type PersistTodoBase = ZodInfer<typeof PersistTodoBase>;

export const PersistTodo = PersistTodoBase.extend({
  history: array(PersistTodoChange),
});
export type PersistTodo = ZodInfer<typeof PersistTodo>;

export const PersistChunkData = object({
  version: literal(1),
  isArchive: boolean().optional(),
  todos: record(TodoId, PersistTodo),
});
export type PersistChunkData = ZodInfer<typeof PersistChunkData>;

export const PersistChunk = object({
  version: literal(1),
  metadata: PersistChunkMetadata,
  data: PersistChunkData,
});
export type PersistChunk = ZodInfer<typeof PersistChunk>;

export const PersistClient = object({
  id: ClientId,
  maxVersion: number(),
  lastActive: Day,
  lastChunk: ChunkId,
});
export type PersistClient = ZodInfer<typeof PersistClient>;

export const PersistMetaChunk = object({
  version: literal(1),
  /** used for CAS only, should be new in every modification */
  id: ChunkId,
  clients: record(ClientId, PersistClient),
});
export type PersistMetaChunk = ZodInfer<typeof PersistMetaChunk>;
