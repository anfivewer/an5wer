import {enum as zodEnum, infer as Infer} from 'zod';

export const FiestaRenderPageEnum = zodEnum(['root', 'admin']);
export const FiestaRenderPage = FiestaRenderPageEnum.enum;
export type FiestaRenderPage = Infer<typeof FiestaRenderPageEnum>;
