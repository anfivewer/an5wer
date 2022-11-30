import {ZodInfer} from '@-/types/src/zod/zod';
import {array, number, object, string} from 'zod';

export const SinglePercentileData = object({
  p: number(),
  index: number(),
  key: string(),
});
export type SinglePercentileData = ZodInfer<typeof SinglePercentileData>;

export const PercentilesData = object({
  count: number(),
  percentiles: array(SinglePercentileData),
});
export type PercentilesData = ZodInfer<typeof PercentilesData>;
