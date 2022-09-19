import {FiestaRenderOptions} from '@-/fiesta-types/src/site/render';

export type GetStateFn<T> = (options: FiestaRenderOptions) => Promise<T>;
