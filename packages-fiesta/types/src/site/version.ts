import {object, string} from 'zod';
import {ZodInfer} from '@-/types/src/zod/zod';

export const VersionJson = object({
  version: string(),
});
export type VersionJson = ZodInfer<typeof VersionJson>;
