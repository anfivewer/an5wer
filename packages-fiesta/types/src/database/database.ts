import {CarEvent} from '../data/events';

export type Database = {
  getFiestaEvents: () => Promise<{
    events: CarEvent[];
    plannedEvents: CarEvent[];
  }>;
};
