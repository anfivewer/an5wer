import {RootPageState} from '@-/fiesta-types/src/site/state/root';
import {GetStateFn} from '../types';

export const getRootPageState: GetStateFn<RootPageState> = async ({
  database,
}) => {
  const {events, plannedEvents} = await database.getFiestaEvents();

  return {
    events,
    plannedEvents,
  };
};
