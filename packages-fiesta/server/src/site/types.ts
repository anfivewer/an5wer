import {
  FiestaRenderPage,
  FiestaRenderPageEnum,
  RequestData,
} from '@-/fiesta-site/src/entries/types';
import {object, array, string, infer as Infer, record} from 'zod';
import {Context} from '../types/context';

export const EntryManifest = object({
  name: string(),
  version: string(),
  js: array(string()),
  css: array(string()),
});
export type EntryManifest = Infer<typeof SiteManifest>;

export const SiteManifest = record(FiestaRenderPageEnum, EntryManifest);
export type SiteManifest = Infer<typeof SiteManifest>;

export type SiteRenderer = {
  init: (options: {context: Context}) => Promise<void>;
  render: (options: {
    page: FiestaRenderPage;
    request: RequestData;
  }) => Promise<string>;
};
