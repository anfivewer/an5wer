import {object, record, ZodEnum, literal, array, string} from 'zod';
import {ZodInfer} from '../zod/zod';
import {EntryManifest} from './entry-manifest';

export const CommonSiteManifest = object({
  version: literal(1),
  entries: record(EntryManifest),
  ssrEntries: array(string()),
});
export type CommonSiteManifest = ZodInfer<typeof CommonSiteManifest>;

export const createSiteManifestParser = <
  Pages extends [string, ...string[]],
  Ssrs extends [string, ...string[]],
>({
  pageZodEnum,
  ssrZodEnum,
}: {
  pageZodEnum: ZodEnum<Pages>;
  ssrZodEnum: ZodEnum<Ssrs>;
}) => {
  return object({
    version: literal(1),
    entries: record(pageZodEnum, EntryManifest),
    ssrEntries: array(ssrZodEnum),
  });
};
