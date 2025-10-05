import {IRouteStore} from '@-/util-react/src/router';
import {AnnotationsMap} from 'mobx';

export const QUERY_PAGE = 'page';

export const enum Page {
  main = 'main',
  newTodo = 'newTodo',
}

export const AUTO_OBSERVABLE_ANNOTATIONS: AnnotationsMap<
  IRouteStore<any>,
  never
> = {
  parseLocation: false,
  toUrl: false,
};
