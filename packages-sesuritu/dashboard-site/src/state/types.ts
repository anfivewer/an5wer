import {SiteRenderOptions} from '@-/sesuritu-types/src/site/render';

export type GetStateFn<T> = (options: SiteRenderOptions) => Promise<T>;
