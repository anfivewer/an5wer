import {SiteRenderPageEnum} from '@-/sesuritu-types/src/site/pages';
import {runBuild} from '@-/frontend/src/build/build';
import {resolve} from 'path';

runBuild({
  packagePath: resolve(__dirname, '../..'),
  clientEntriesZodEnum: SiteRenderPageEnum,
});
