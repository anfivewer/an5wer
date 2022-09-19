import {createDirectus, FiestaDirectus} from '@-/directus-fiesta/src/types';
import {CarEvents, CarEventType} from '@-/fiesta-types/src/data/events';
import {Database} from '@-/fiesta-types/src/database/database';
import {BaseComponent} from '@-/types/src/app/component';
import {Context} from '../../types/context';

export class DirectusDatabase extends BaseComponent implements Database {
  private directus!: FiestaDirectus;

  init({context}: {context: Context}) {
    if (!context.directusUrlInternal) {
      throw new Error('no context.directusUrlInternal');
    }

    this.directus = createDirectus(context.directusUrlInternal);

    return Promise.resolve();
  }

  async getFiestaEvents(): ReturnType<Database['getFiestaEvents']> {
    const [eventsResult, plannedResult] = await Promise.all([
      this.directus.items('events').readByQuery({
        filter: {type: {_neq: CarEventType.planned}},
        sort: ['-id'],
      }),
      this.directus.items('events').readByQuery({
        filter: {type: {_eq: CarEventType.planned}},
        sort: ['id'],
      }),
    ]);

    const events = CarEvents.parse(eventsResult.data);
    const plannedEvents = CarEvents.parse(plannedResult.data);

    return {
      events,
      plannedEvents,
    };
  }
}
