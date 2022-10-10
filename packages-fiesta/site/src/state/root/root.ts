import {RootPageState} from '@-/fiesta-types/src/site/state/root';
import {GetStateFn} from '../types';
import {calculateConsumption} from './consumption';

export const getRootPageState: GetStateFn<RootPageState> = async ({
  database,
}) => {
  const {events, plannedEvents} = await database.getFiestaEvents();

  const totalConsumption = calculateConsumption({events});

  return {
    events,
    plannedEvents,
    totalConsumption,
  };
};
