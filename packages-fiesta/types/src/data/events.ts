import {
  number,
  object,
  optional,
  string,
  enum as zodEnum,
  infer as Infer,
} from 'zod';

export const CarEventType = zodEnum([
  'fuel',
  'accident',
  'service',
  'odometer',
  'custom',
  'planned',
]);
export const CarEventTypeEnum = CarEventType.enum;
export type CarEventType = Infer<typeof CarEventType>;

export const CarEvent = object({
  id: string(),
  type: CarEventType,
  title: string(),
  date: optional(string()),
  mileageKm: optional(number()),
  description: optional(string()),
  addFuelLiters: optional(number()),
  priceByn: optional(number()),
  usdToByn: optional(number()),
});
export type CarEvent = Infer<typeof CarEvent>;
