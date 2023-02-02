import {ZodInfer} from '@-/types/src/zod/zod';
import {array, number, object} from 'zod';
import {EncodedKey} from '../database/types';

export const SinglePercentileData = object({
  p: number(),
  index: number(),
  key: EncodedKey,
});
export type SinglePercentileData = ZodInfer<typeof SinglePercentileData>;

export const PercentilesData = object({
  count: number(),
  percentiles: array(SinglePercentileData),
});
export type PercentilesData = ZodInfer<typeof PercentilesData>;
