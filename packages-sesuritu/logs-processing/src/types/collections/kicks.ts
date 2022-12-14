import {ZodInfer} from '@-/types/src/zod/zod';
import {number, object, record, string} from 'zod';

export const KicksCollectionItem = object({
  reason: string(),
  chatId: string(),
  userId: string(),
});
export type KicksCollectionItem = ZodInfer<typeof KicksCollectionItem>;

export const AggregatedKicksCollectionItem = object({
  count: number(),
  reasons: record(number().optional()),
});
export type AggregatedKicksCollectionItem = ZodInfer<
  typeof AggregatedKicksCollectionItem
>;
