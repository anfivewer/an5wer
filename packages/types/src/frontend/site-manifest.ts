import {object, record, ZodEnum, literal, array, string} from 'zod';
import {ZodInfer} from '../zod/zod';
import {EntryManifest} from './entry-manifest';

export const CommonSiteManifest = object({
  version: literal(1),
  entries: record(string(), EntryManifest),
  ssrEntries: array(string()),
});
export type CommonSiteManifest = ZodInfer<typeof CommonSiteManifest>;

export const createSiteManifestParser = <
  Pages extends ZodEnum<any>,
  Ssrs extends ZodEnum<any>,
>({
  pageZodEnum,
  ssrZodEnum,
}: {
  pageZodEnum: Pages;
  ssrZodEnum: Ssrs;
}) => {
  return object({
    version: literal(1),
    entries: record(pageZodEnum, EntryManifest),
    ssrEntries: array(ssrZodEnum),
  });
};
