export const enum MileageTimeEventType {
  fuel = 'fuel',
  accident = 'accident',
  service = 'service',
  odometer = 'odometer',
  custom = 'custom',
}

export type MileageTimeEvent = {
  type: MileageTimeEventType;
  mileageKm?: number;
  date?: {year: number; month: number; day?: number};
  title: string;
  description?: string;
  images?: {url: string}[];
  addFuelLiters?: number;
  price?: {byn?: number; usd?: number};
};
