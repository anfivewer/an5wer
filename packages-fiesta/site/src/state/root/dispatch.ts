import {RootMst} from './mst';

export const enum RootDispatchEventType {
  switchPage = 'switchPage',
}

export type RootDispatchEvent = {
  type: RootDispatchEventType.switchPage;
  page: RootMst['page'];
};

export type RootDispatchFn = (event: RootDispatchEvent) => void;
