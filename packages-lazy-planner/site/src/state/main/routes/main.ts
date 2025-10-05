import {IRouteStore, RouteData, RouterLocation} from '@-/util-react/src/router';
import {Page, QUERY_PAGE} from './constants';

export type MainRouteData = RouteData;

export class MainRoute implements IRouteStore<MainRouteData> {
  data: MainRouteData | null = null;

  parseLocation(location: RouterLocation): RouteData | null {
    const {search} = location;
    const page = search.get(QUERY_PAGE);

    if (page !== null && page !== Page.main) {
      return null;
    }

    return {};
  }
  toUrl(_data: MainRouteData): RouterLocation {
    return {
      path: '',
      hash: '',
      search: new URLSearchParams(),
    };
  }
}
