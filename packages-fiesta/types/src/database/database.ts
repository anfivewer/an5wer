import {CarEvent} from '../data/events';

export type Database = {
  getSiteVersion: () => Promise<string>;

  getFiestaEvents: () => Promise<{
    events: CarEvent[];
    plannedEvents: CarEvent[];
  }>;
};
