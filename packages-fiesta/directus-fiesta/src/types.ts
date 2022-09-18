import {Directus} from '@directus/sdk';

type FiestaDirectusType = Record<string, never>;

export type FiestaDirectus = Directus<FiestaDirectusType>;

export const createDirectus = (url: string) => {
  return new Directus<FiestaDirectusType>(url);
};
