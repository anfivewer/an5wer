import {IRouteStore, RouteData, RouterLocation} from '@-/util-react/src/router';
import {AUTO_OBSERVABLE_ANNOTATIONS, Page, QUERY_PAGE} from './constants';
import {makeAutoObservable} from 'mobx';

export type NewTodoRouteData = RouteData;

export class NewTodoRoute implements IRouteStore<NewTodoRouteData> {
  data: NewTodoRouteData | null = null;

  constructor() {
    makeAutoObservable(this, AUTO_OBSERVABLE_ANNOTATIONS);
  }

  parseLocation(location: RouterLocation): RouteData | null {
    const {search} = location;
    const page = search.get(QUERY_PAGE);

    if (page !== Page.newTodo) {
      return null;
    }

    return {};
  }
  toUrl(_data: NewTodoRouteData): RouterLocation {
    const search = new URLSearchParams();
    search.set(QUERY_PAGE, Page.newTodo);

    return {
      path: '',
      hash: '',
      search,
    };
  }

  goTo = () => {
    this.data = {};
  };
}
