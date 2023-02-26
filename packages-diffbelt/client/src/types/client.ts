import {object, string} from 'zod';
import {
  CollectionGetKeysAroundOptions,
  GetOptions,
} from '@-/diffbelt-types/src/database/types';
import {ZodInfer} from '@-/types/src/zod/zod';

export const GetRequestBody = GetOptions.and(
  object({
    collectionName: string(),
  }),
);
export type GetRequestBody = ZodInfer<typeof GetRequestBody>;

export const GetKeysAroundRequestBody = CollectionGetKeysAroundOptions.and(
  object({
    collectionName: string(),
  }),
);
export type GetKeysAroundRequestBody = ZodInfer<
  typeof GetKeysAroundRequestBody
>;
