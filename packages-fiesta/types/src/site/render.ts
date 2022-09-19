import {Database} from '../database/database';
import {EntryManifest} from '../server/manifest';
import {FiestaRenderPage} from './pages';

export type RequestData = {
  url: string;
};

export type FiestaRenderOptions = {
  manifest: EntryManifest | undefined;
  page: FiestaRenderPage;
  request: RequestData;
  clientBuildPath: string;
  stylesCache: Map<string, string>;
  database: Database;
};

export type FiestaRenderFun = (options: FiestaRenderOptions) => Promise<string>;
