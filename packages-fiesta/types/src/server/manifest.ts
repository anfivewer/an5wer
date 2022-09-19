import {object, array, string, infer as Infer, record} from 'zod';
import {FiestaRenderPageEnum} from '../site/pages';

export const EntryManifest = object({
  name: string(),
  version: string(),
  basePath: string(),
  js: array(string()),
  css: array(string()),
});
export type EntryManifest = Infer<typeof EntryManifest>;

export const SiteManifest = record(FiestaRenderPageEnum, EntryManifest);
export type SiteManifest = Infer<typeof SiteManifest>;
