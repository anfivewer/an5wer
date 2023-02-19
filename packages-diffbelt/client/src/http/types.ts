import {EncodingTypeEnum} from '@-/diffbelt-types/src/database/types';
import {ZodInfer} from '@-/types/src/zod/zod';
import {any, array, boolean, object, string} from 'zod';

type JsonObject = {[key: string]: Json};
type JsonArray = Json[];
type Json =
  | JsonObject
  | JsonArray
  | number
  | string
  | null
  | undefined
  | boolean;

export type CallApiOptions<T> = {
  method: 'GET' | 'POST' | 'DELETE';
  path: string;
  params?: Record<string, string | undefined>;
  body?: JsonObject;
  parser: {parse: (data: unknown) => T};
};

export type CallApiFn = <T>(options: CallApiOptions<T>) => Promise<T>;

export const VoidParser = any();

export const GetCollectionResponse = object({
  isManual: boolean(),
  generationId: string().optional(),
  generationIdEncoding: EncodingTypeEnum.optional(),
  nextGenerationId: string().optional(),
  nextGenerationIdEncoding: EncodingTypeEnum.optional(),
});
export type GetCollectionResponse = ZodInfer<typeof GetCollectionResponse>;

export const ListCollectionsResponse = object({
  items: array(
    object({
      name: string(),
      isManual: boolean(),
      generationId: string(),
      generationIdEncoding: EncodingTypeEnum.optional(),
    }),
  ),
});
export type ListCollectionsResponse = ZodInfer<typeof ListCollectionsResponse>;