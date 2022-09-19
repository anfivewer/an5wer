import {
  number,
  object,
  string,
  enum as zodEnum,
  infer as Infer,
  array,
} from 'zod';

export const CarEventTypeEnum = zodEnum([
  'fuel',
  'accident',
  'service',
  'odometer',
  'custom',
  'planned',
]);
export const CarEventType = CarEventTypeEnum.enum;
export type CarEventType = Infer<typeof CarEventTypeEnum>;

export const CarEvent = object({
  id: string(),
  type: CarEventTypeEnum,
  title: string(),
  date: string().nullish(),
  mileageKm: number().nullish(),
  description: string().nullish(),
  addFuelLiters: number().nullish(),
  priceByn: number().nullish(),
  usdToByn: number().nullish(),
});
export type CarEvent = Infer<typeof CarEvent>;

export const CarEvents = array(CarEvent);
