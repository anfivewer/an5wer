import {ServerManifest} from '../types/build/manifest';
import {enum as zodEnum, infer as Infer} from 'zod';

export type FiestaState = {
  rootId: string;
  answer: number;
};

export const FiestaRenderPageEnum = zodEnum(['root', 'admin']);
export const FiestaRenderPage = FiestaRenderPageEnum.enum;
export type FiestaRenderPage = Infer<typeof FiestaRenderPageEnum>;

export type RequestData = {
  url: string;
};

export type FiestaRenderFun = (options: {
  manifest: ServerManifest | undefined;
  page: FiestaRenderPage;
  request: RequestData;
}) => Promise<string>;
