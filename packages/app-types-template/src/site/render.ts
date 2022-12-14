import {EntryManifest} from '@-/types/src/frontend/entry-manifest';
import {SiteRenderPage} from './pages';

export type RequestData = {
  url: string;
};

export type SiteRenderOptions = {
  manifest: EntryManifest | undefined;
  page: SiteRenderPage;
  request: RequestData;
  clientBuildPath: string;
  stylesCache: Map<string, string>;
};

export type SiteRenderFun = (options: SiteRenderOptions) => Promise<string>;
