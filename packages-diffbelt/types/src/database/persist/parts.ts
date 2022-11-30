import {array, boolean, literal, number, object, string, union} from 'zod';
import {ZodInfer} from '@-/types/src/zod/zod';

export const PersistDatabaseHeader = object({
  type: literal('header'),
  version: number(),
});
export type PersistDatabaseHeader = ZodInfer<typeof PersistDatabaseHeader>;

export const PersistDatabaseFooter = object({
  type: literal('end'),
});
export type PersistDatabaseFooter = ZodInfer<typeof PersistDatabaseFooter>;

export const PersistCollection = object({
  type: literal('collection'),
  name: string(),
  generationId: string(),
  nextGenerationId: string().optional(),
  isManual: boolean(),
});
export type PersistCollection = ZodInfer<typeof PersistCollection>;

export const PersistCollectionItems = object({
  type: literal('items'),
  collectionName: string(),
  items: array(
    object({
      key: string(),
      value: string().nullable(),
      generationId: string(),
      phantomId: string().optional(),
    }),
  ),
});
export type PersistCollectionItems = ZodInfer<typeof PersistCollectionItems>;

export const PersistCollectionGeneration = object({
  type: union([literal('generation'), literal('nextGeneration')]),
  collectionName: string(),
  generationId: string(),
  changedKeys: array(string()),
});
export type PersistCollectionGeneration = ZodInfer<
  typeof PersistCollectionGeneration
>;

export const PersistCollectionReaders = object({
  type: literal('readers'),
  collectionName: string(),
  readers: array(
    object({
      readerId: string(),
      generationId: string().nullable(),
      collectionName: string().optional(),
    }),
  ),
});
export type PersistCollectionReaders = ZodInfer<
  typeof PersistCollectionReaders
>;

export const PersistCollectionPhantoms = object({
  type: literal('phantoms'),
  collectionName: string(),
  lastPhantomId: string(),
});
export type PersistCollectionPhantoms = ZodInfer<
  typeof PersistCollectionPhantoms
>;

export const PersistDatabasePart = union([
  PersistDatabaseHeader,
  PersistDatabaseFooter,
  PersistCollection,
  PersistCollectionItems,
  PersistCollectionGeneration,
  PersistCollectionReaders,
  PersistCollectionPhantoms,
]);
export type PersistDatabasePart = ZodInfer<typeof PersistDatabasePart>;
