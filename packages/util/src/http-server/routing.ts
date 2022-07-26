type RegExpRoute<PathData> = {
  regexp: RegExp;
  data: PathData;
};

type RoutingResult<PathData> = {
  data: PathData;
  regexpGroups: string[];
};

export class Routing<PathData> {
  private staticRoutes = new Map<string, PathData>();
  private regexpRoutes: RegExpRoute<PathData>[] = [];

  constructor() {
    //
  }

  addStaticRoute(path: string, data: PathData) {
    this.staticRoutes.set(path, data);
  }

  addRegexpRoute(regexp: RegExp, data: PathData) {
    this.regexpRoutes.push({
      regexp,
      data,
    });
  }

  route(path: string): RoutingResult<PathData> | undefined {
    const staticRoute = this.staticRoutes.get(path);
    if (staticRoute) {
      return {
        data: staticRoute,
        regexpGroups: [],
      };
    }

    const findRegexpRoute = (): RoutingResult<PathData> | undefined => {
      for (const route of this.regexpRoutes) {
        const {regexp, data} = route;

        regexp.lastIndex = 0;
        const match = regexp.exec(path);

        if (match) {
          return {
            data,
            regexpGroups: match,
          };
        }
      }

      return undefined;
    };

    return findRegexpRoute();
  }
}
