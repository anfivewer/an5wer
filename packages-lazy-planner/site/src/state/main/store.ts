import {MainPageState} from '@-/lazy-planner-types/src/site/state/main';
import {Router} from '@-/util-react/src/router';
import {MainRoute} from './routes/main';
import {NewTodoRoute} from './routes/new-todo';
import {CreateTodoStore} from './createTodo';

export class MainStore {
  serverState: MainPageState;
  router: Router;
  mainRoute = new MainRoute();
  newTodoRoute = new NewTodoRoute();
  createTodoStore?: CreateTodoStore;

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

  goToCreateTodo = () => {
    this.createTodoStore = undefined;
    this.newTodoRoute.goTo();
  };

  getCreateTodoStore() {
    if (!this.createTodoStore) {
      this.createTodoStore = new CreateTodoStore({mainStore: this});
    }
    return this.createTodoStore;
  }
}
