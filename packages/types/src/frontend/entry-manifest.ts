import {object, array, string, infer as Infer} from 'zod';

export const EntryManifest = object({
  name: string(),
  version: string(),
  basePath: string(),
  js: array(string()),
  css: array(string()),
});
export type EntryManifest = Infer<typeof EntryManifest>;
