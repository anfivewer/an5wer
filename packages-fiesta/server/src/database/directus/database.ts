import {createDirectus, FiestaDirectus} from '@-/directus-fiesta/src/types';
import {CarEvents, CarEventType} from '@-/fiesta-types/src/data/events';
import {Database} from '@-/fiesta-types/src/database/database';
import {BaseComponent} from '@-/types/src/app/component';
import {
  databaseDependency,
  directusDependency,
} from '../../context/dependencies';
import {Context} from '../../types/context';

export class DirectusDatabase extends BaseComponent implements Database {
  private directus!: FiestaDirectus;

  async init({context}: {context: Context}) {
    const {
      dependenciesGraph,
      config: {directusAdminEmail, directusAdminPassword},
    } = context;

    await dependenciesGraph.onCompleted([directusDependency]);

    const {directusUrlInternal} = context;

    if (!directusUrlInternal) {
      throw new Error('no context.directusUrlInternal');
    }

    this.directus = createDirectus(directusUrlInternal);

    await this.directus.auth.login({
      email: directusAdminEmail,
      password: directusAdminPassword,
    });

    dependenciesGraph.markCompleted(databaseDependency);
  }

  async getSiteVersion(): ReturnType<Database['getSiteVersion']> {
    const result = await this.directus.items('kv').readOne('site-version');

    const value = result?.value;
    if (!value) {
      throw new Error('no site version');
    }

    return value;
  }

  async getFiestaEvents(): ReturnType<Database['getFiestaEvents']> {
    const [eventsResult, plannedResult] = await Promise.all([
      this.directus.items('events').readByQuery({
        filter: {type: {_neq: CarEventType.planned}},
        sort: ['-id'],
        limit: -1,
      }),
      this.directus.items('events').readByQuery({
        filter: {type: {_eq: CarEventType.planned}},
        sort: ['id'],
        limit: -1,
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
