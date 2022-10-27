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
  nextGenerationKeys: array(string()),
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
    }),
  ),
});
export type PersistCollectionItems = ZodInfer<typeof PersistCollectionItems>;

export const PersistDatabasePart = union([
  PersistDatabaseHeader,
  PersistDatabaseFooter,
  PersistCollection,
  PersistCollectionItems,
]);
export type PersistDatabasePart = ZodInfer<typeof PersistDatabasePart>;
