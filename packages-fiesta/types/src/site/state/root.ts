import {array, infer as Infer, object} from 'zod';
import {CarEvent} from '../../data/events';

export const RootPageState = object({
  // ordered desc
  events: array(CarEvent),
  plannedEvents: array(CarEvent),
});
export type RootPageState = Infer<typeof RootPageState>;
