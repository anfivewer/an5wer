import {MainPageState} from '@-/app-types-template/src/site/state/main';

export class MainStore {
  serverState: MainPageState;

  constructor(options: {serverState: MainPageState}) {
    this.serverState = options.serverState;
  }
}
