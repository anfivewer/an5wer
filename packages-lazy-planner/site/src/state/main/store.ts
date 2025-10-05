import {MainPageState} from '@-/lazy-planner-types/src/site/state/main';
import {Router} from '@-/util-react/src/router';
import {MainRoute} from './routes/main';
import {NewTodoRoute} from './routes/new-todo';

export class MainStore {
  serverState: MainPageState;
  router: Router;
  mainRoute = new MainRoute();
  newTodoRoute = new NewTodoRoute();

  constructor(options: {serverState: MainPageState}) {
    this.serverState = options.serverState;
    this.router = this.#createRouter();
  }

  #createRouter(): Router {
    const router = new Router();

    router.registerRoute(this.mainRoute);
    router.registerRoute(this.newTodoRoute);

    return router;
  }
}
