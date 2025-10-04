import {MainPageState} from '@-/lazy-planner-types/src/site/state/main';

export class MainStore {
  serverState: MainPageState;

  constructor(options: {serverState: MainPageState}) {
    this.serverState = options.serverState;
  }
}
