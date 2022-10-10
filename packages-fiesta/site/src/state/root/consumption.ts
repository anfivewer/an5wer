import {CarEvent} from '@-/fiesta-types/src/data/events';
import {TotalConsumption} from '@-/fiesta-types/src/site/state/root';

const CALCULATE_CONSUMPTION_FROM = '2022-05-07';

export const calculateConsumption = ({
  events,
}: {
  events: CarEvent[];
}): TotalConsumption | undefined => {
  const pos =
    events.findIndex((event) => {
      if (!event.date) {
        return false;
      }

      return event.date < CALCULATE_CONSUMPTION_FROM;
    }) - 1;

  if (pos < 0) {
    return;
  }

  const initialMileage = (() => {
    for (let i = pos; i >= 0; i--) {
      const {mileageKm} = events[i];

      if (typeof mileageKm === 'number') {
        return mileageKm;
      }
    }

    return -1;
  })();

  if (initialMileage < 0) {
    return;
  }

  const lastMileage = events.find(({mileageKm}) => Boolean(mileageKm))!
    .mileageKm!;

  const totalDistance = lastMileage - initialMileage;

  let totalLiters = 0;

  for (let i = 0; i <= pos; i++) {
    const {addFuelLiters} = events[i];

    if (addFuelLiters) {
      totalLiters += addFuelLiters;
    }
  }

  const consumptionPer100km = (totalLiters / totalDistance) * 100;

  return {totalDistance, totalLiters, consumptionPer100km};
};
