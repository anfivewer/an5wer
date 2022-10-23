import {ZodInfer} from '@-/types/src/zod/zod';
import {object, string} from 'zod';

export const AdminPageState = object({
  directusUrl: string(),
});
export type AdminPageState = ZodInfer<typeof AdminPageState>;
