import {IRouteStore, RouteData, RouterLocation} from '@-/util-react/src/router';
import {AUTO_OBSERVABLE_ANNOTATIONS, Page, QUERY_PAGE} from './constants';
import {makeAutoObservable} from 'mobx';

export type MainRouteData = RouteData;

export class MainRoute implements IRouteStore<MainRouteData> {
  data: MainRouteData | null = null;

  constructor() {
    makeAutoObservable(this, AUTO_OBSERVABLE_ANNOTATIONS);
  }

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

  goTo = () => {
    this.data = {};
  };
}
