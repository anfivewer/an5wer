import {enum as zodEnum, infer as Infer} from 'zod';

export const SiteRenderPageEnum = zodEnum(['main']);
export const SiteRenderPage = SiteRenderPageEnum.enum;
export type SiteRenderPage = Infer<typeof SiteRenderPageEnum>;
