import {CarEvent} from '@-/fiesta-types/src/data/events';
import {TotalConsumption} from '@-/fiesta-types/src/site/state/root';

const CALCULATE_CONSUMPTION_FROM = '2022-05-07';

export const calculateConsumption = ({
  events,
}: {
  events: CarEvent[];
}): TotalConsumption | undefined => {
  const startFromPos =
    events.findIndex(({date}) => {
      if (!date) {
        return false;
      }

      return date < CALCULATE_CONSUMPTION_FROM;
    }) - 1;

  const lastMileagePos = events.findIndex(({mileageKm}) => Boolean(mileageKm));

  if (startFromPos < 0 || lastMileagePos < 0) {
    return;
  }

  const initialMileage = (() => {
    for (let i = startFromPos; i >= 0; i--) {
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

  const lastMileage = events[lastMileagePos].mileageKm!;

  const totalDistance = lastMileage - initialMileage;

  let totalLiters = 0;

  // do not calculate latest fillings without mileage, it will raise consumption
  for (let i = lastMileagePos; i <= startFromPos; i++) {
    const {addFuelLiters} = events[i];

    if (addFuelLiters) {
      totalLiters += addFuelLiters;
    }
  }

  const consumptionPer100km = (totalLiters / totalDistance) * 100;

  return {totalDistance, totalLiters, consumptionPer100km};
};
