export type RouterLocation = {
  path: string;
  search: URLSearchParams;
  hash: string;
};

export type RouteData = {
  replaceCounter?: number;
};

export interface IRouteStore<Data extends RouteData> {
  parseLocation: (location: RouterLocation) => Data | null;
  toUrl: (data: Data) => RouterLocation;

  get data(): Data | null;
  set data(data: Data | null);
}
