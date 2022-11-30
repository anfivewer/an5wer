import {PercentilesData} from '@-/diffbelt-types/src/transform/percentiles';
import {ZodInfer} from '@-/types/src/zod/zod';
import {number, object, record, string} from 'zod';

export const UpdateHandleIntermediateItem = object({
  updateType: string(),
  ms: number(),
});
export type UpdateHandleIntermediateItem = ZodInfer<
  typeof UpdateHandleIntermediateItem
>;

export const UpdateHandleTargetItem = object({
  sumMs: number(),
  percentilesData: PercentilesData,
  msByType: record(number().optional()),
});
export type UpdateHandleTargetItem = ZodInfer<typeof UpdateHandleTargetItem>;
