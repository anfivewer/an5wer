import {createSiteManifestParser} from '@-/types/src/frontend/site-manifest';
import {zodEnum, ZodInfer} from '@-/types/src/zod/zod';
import {SiteRenderPageEnum} from './pages';

const SsrEnum = zodEnum(['main']);

export const SiteManifest = createSiteManifestParser({
  pageZodEnum: SiteRenderPageEnum,
  ssrZodEnum: SsrEnum,
});
export type SiteManifest = ZodInfer<typeof SiteManifest>;
