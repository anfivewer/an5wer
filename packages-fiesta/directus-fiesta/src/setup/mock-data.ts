import {getMockEvents} from '../mocks/events';
import {FiestaDirectus} from '../types';

export const setupMockData = async ({directus}: {directus: FiestaDirectus}) => {
  const eventsCollection = directus.items('events');

  const existingEvents = await eventsCollection.readByQuery({
    limit: 1,
  });

  if (existingEvents.data?.length) {
    return;
  }

  await eventsCollection.createMany(getMockEvents());
};
