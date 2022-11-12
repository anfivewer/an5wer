import {createSiteManifestParser} from '@-/types/src/frontend/site-manifest';
import {zodEnum, ZodInfer} from '@-/types/src/zod/zod';
import {FiestaRenderPageEnum} from '../site/pages';

const SsrEnum = zodEnum(['server']);

export const SiteManifest = createSiteManifestParser({
  pageZodEnum: FiestaRenderPageEnum,
  ssrZodEnum: SsrEnum,
});
export type SiteManifest = ZodInfer<typeof SiteManifest>;
