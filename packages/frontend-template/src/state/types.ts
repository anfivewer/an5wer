import {SiteRenderOptions} from '@-/app-types-template/src/site/render';

export type GetStateFn<T> = (options: SiteRenderOptions) => Promise<T>;
