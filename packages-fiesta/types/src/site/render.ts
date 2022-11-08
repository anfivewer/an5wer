import {EntryManifest} from '@-/types/src/frontend/entry-manifest';
import {Database} from '../database/database';
import {Config} from '../server/config';
import {FiestaRenderPage} from './pages';

export type RequestData = {
  url: string;
};

export type FiestaRenderConfig = Pick<Config, 'adminPath' | 'directusPath'>;

export type FiestaRenderOptions = {
  manifest: EntryManifest | undefined;
  page: FiestaRenderPage;
  request: RequestData;
  clientBuildPath: string;
  stylesCache: Map<string, string>;
  database: Database;
  config: FiestaRenderConfig;
};

export type FiestaRenderFun = (options: FiestaRenderOptions) => Promise<string>;
