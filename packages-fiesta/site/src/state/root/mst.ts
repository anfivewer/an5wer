import {types, Instance} from 'mobx-state-tree';
import {zodToMst} from '@-/util-react/src/mst/zod/zod-to-mst';
import {RootPageState} from '@-/fiesta-types/src/site/state/root';
import {PageName} from './pages/name';

export const CarPageMst = types.model({
  name: types.literal(PageName.car),
});

export const CarEventsPageMst = types.model({
  name: types.literal(PageName.carEvents),
});

const ServerStateMst = zodToMst(RootPageState);
export type ServerStateMst = Instance<typeof ServerStateMst>;

const PageMst = types.union(CarPageMst, CarEventsPageMst);

export const RootMst = types
  .model({
    page: PageMst,
    serverState: ServerStateMst,
  })
  .actions((self) => {
    return {
      setPage(newPage: Instance<typeof PageMst>) {
        self.page = newPage;
      },
    };
  });

export type RootMst = Instance<typeof RootMst>;
