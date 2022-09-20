import {ZodInfer} from '@-/fiesta-types/src/zod/zod';
import {literal, number, object, union} from 'zod';

export const Execution = object({
  id: union([literal(1), literal(2)]),
  version: number(),
  port: number(),
  directusPort: number(),
});

export const ExecutionConfig = object({
  currentVersion: number(),
  currentExecution: Execution.optional(),
  nextExecution: Execution.optional(),
});
export type ExecutionConfig = ZodInfer<typeof ExecutionConfig>;
