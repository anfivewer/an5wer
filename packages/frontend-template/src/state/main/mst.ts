import {types, Instance} from 'mobx-state-tree';
import {zodToMst} from '@-/util-react/src/mst/zod/zod-to-mst';
import {MainPageState} from '@-/app-types-template/src/site/state/main';

const ServerStateMst = zodToMst(MainPageState);
export type ServerStateMst = Instance<typeof ServerStateMst>;

export const MainMst = types.model({
  serverState: ServerStateMst,
});

export type MainMst = Instance<typeof MainMst>;
