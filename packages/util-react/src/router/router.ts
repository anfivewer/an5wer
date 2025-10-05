import {action, makeAutoObservable, reaction, runInAction} from 'mobx';
import {IRouteStore, RouteData, RouterLocation} from './types';
import {isLocationEqual, parseCurrentLocation, serializeLocation} from './util';

/* eslint-disable @typescript-eslint/no-explicit-any */

export class Router {
  _routes = new Set<IRouteStore<any>>();
  _activeRoute: IRouteStore<any> | null = null;
  #activeRouteReplaceCounter: number | undefined;
  #prevReplaceCounter:
    | {route: IRouteStore<any>; replaceCounter: number | undefined}
    | undefined;
  _location: RouterLocation;

  constructor() {
    this._location = parseCurrentLocation();

    makeAutoObservable(this);

    reaction(
      () => this._location,
      (location) => {
        const current = parseCurrentLocation();
        if (isLocationEqual(current, location)) {
          return;
        }

        const findNewRoute = action(() => {
          const newRouteWithData = this.#findRouteForLocation(location);
          if (!newRouteWithData) {
            if (this._activeRoute) {
              this._activeRoute.data = null;
              this._activeRoute = null;
            }
            return;
          }

          if (
            this._activeRoute &&
            this._activeRoute !== newRouteWithData.route
          ) {
            this._activeRoute.data = null;
          }

          this._activeRoute = newRouteWithData.route;
          this._activeRoute.data = newRouteWithData.data;
        });

        if (this._activeRoute) {
          const routeLocation = this._activeRoute.toUrl(this._activeRoute.data);
          if (!isLocationEqual(routeLocation, location)) {
            findNewRoute();

            return;
          }
        } else {
          findNewRoute();
          return;
        }

        const needReplace = this.#isNeedReplace();
        this.#prevReplaceCounter = {
          route: this._activeRoute,
          replaceCounter: this.#activeRouteReplaceCounter,
        };

        if (needReplace) {
          window.history.replaceState({}, '', serializeLocation(location));
        } else {
          window.history.pushState({}, '', serializeLocation(location));
        }
      },
    );

    // TODO: subscribe for popstate/other location change events
  }

  get activeRoute(): IRouteStore<RouteData> | null {
    return this._activeRoute;
  }

  registerRoute<Data extends RouteData>(route: IRouteStore<Data>) {
    this._routes.add(route);

    reaction(
      () => {
        return route.data;
      },
      action((data) => {
        if (!data) {
          if (this._activeRoute === route) {
            this._activeRoute = null;
          }

          return;
        }

        if (this._activeRoute && this._activeRoute !== route) {
          this._activeRoute.data = null;
        }

        if (this._activeRoute !== route) {
          this._activeRoute = route;
        }

        const location = this._activeRoute.toUrl(data);

        if (!isLocationEqual(location, this._location)) {
          this._location = location;
          this.#activeRouteReplaceCounter = data.replaceCounter;
        }
      }),
      {fireImmediately: true},
    );

    const data = route.parseLocation(this._location);
    if (data) {
      runInAction(() => {
        route.data = data;
      });
    }
  }

  // TODO: optimize by prefix hints
  #findRouteForLocation(
    location: RouterLocation,
  ): {route: IRouteStore<any>; data: any} | null {
    for (const route of this._routes) {
      const data = route.parseLocation(location);
      if (!data) {
        continue;
      }

      return {route, data};
    }

    return null;
  }

  #isNeedReplace() {
    if (typeof this.#activeRouteReplaceCounter !== 'number') {
      return false;
    }

    if (!this.#prevReplaceCounter) {
      return true;
    }

    const {route, replaceCounter} = this.#prevReplaceCounter;

    if (route !== this._activeRoute) {
      return true;
    }

    return replaceCounter !== this.#activeRouteReplaceCounter;
  }
}
