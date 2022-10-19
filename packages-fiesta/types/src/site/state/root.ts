import {array, infer as Infer, number, object, optional} from 'zod';
import {CarEvent} from '../../data/events';

export const TotalConsumption = object({
  totalDistance: number(),
  totalLiters: number(),
  notCalculatedLiters: number(),
  consumptionPer100km: number(),
  pessimisticConsumptionPer100km: number(),
});
export type TotalConsumption = Infer<typeof TotalConsumption>;

export const RootPageState = object({
  // ordered desc
  events: array(CarEvent),
  plannedEvents: array(CarEvent),
  totalConsumption: optional(TotalConsumption),
});
export type RootPageState = Infer<typeof RootPageState>;
