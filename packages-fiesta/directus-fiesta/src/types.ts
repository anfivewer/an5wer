import {Directus} from '@directus/sdk';
import {CarEvent} from '@-/fiesta-types/src/data/events';

type FiestaDirectusType = {
  events: CarEvent;
  kv: {key: string; value: string};
};

export type FiestaDirectus = Directus<FiestaDirectusType>;

export const createDirectus = (url: string) => {
  return new Directus<FiestaDirectusType>(url);
};
