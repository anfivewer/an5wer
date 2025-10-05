import {IRouteStore, RouteData, RouterLocation} from '@-/util-react/src/router';
import {Page, QUERY_PAGE} from './constants';

export type NewTodoRouteData = RouteData;

export class NewTodoRoute implements IRouteStore<NewTodoRouteData> {
  data: NewTodoRouteData | null = null;

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
}
