import {ZodInfer} from '@-/types/src/zod/zod';
import {object, string} from 'zod';

export const KicksCollectionItem = object({
  reason: string(),
  chatId: string(),
  userId: string(),
});
export type KicksCollectionItem = ZodInfer<typeof KicksCollectionItem>;
