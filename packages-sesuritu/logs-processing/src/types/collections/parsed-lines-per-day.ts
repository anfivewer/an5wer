import {ZodInfer} from '@-/types/src/zod/zod';
import {number, object, record} from 'zod';

export const AggregatedParsedLinesPerDayCollectionItem = object({
  count: number(),
  logKeys: record(number().optional()),
});
export type AggregatedParsedLinesPerDayCollectionItem = ZodInfer<
  typeof AggregatedParsedLinesPerDayCollectionItem
>;
