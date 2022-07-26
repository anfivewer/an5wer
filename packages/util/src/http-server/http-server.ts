import http from 'http';
import {Routing} from './routing';
import {
  HttpHandler,
  HttpMethod,
  HttpRawMiddleware,
  HttpResultType,
} from './types';

export class HttpServer {
  private server: http.Server;
  private rawMiddlewares: HttpRawMiddleware[] = [];
  readonly routesGet: Routing<HttpHandler> = new Routing();
  readonly routesPost: Routing<HttpHandler> = new Routing();

  constructor() {
    this.server = http.createServer(this.handleRequest.bind(this));
  }

  private handleRequest(
    req: http.IncomingMessage,
    res: http.ServerResponse,
  ): void {
    (async () => {
      const routing = this.getRoutingByMethod(
        req.method!.toUpperCase() as HttpMethod,
      );
      if (!routing) {
        res.statusCode = 405;
        res.end('405');
        return;
      }

      const url = req.url!;

      const [path, rawQuery] = url.split('?');

      const handler = routing.route(path);
      if (!handler) {
        await this.routeNotFound(req, res);
        return;
      }

      const result = await handler.data.handler({
        req,
        url,
        path,
        rawQuery,
      });

      if (result.statusCode) {
        res.statusCode = result.statusCode;
      }

      switch (result.type) {
        case HttpResultType.json:
          res.setHeader('content-type', 'application/json; charset=utf-8');
          res.end(JSON.stringify(result.data));
          break;
        case HttpResultType.html:
          res.setHeader('content-type', 'text/html; charset=utf-8');
          res.end(result.html);
          break;
        default: {
          const shouldBeNever: never = result;
          throw new Error('unknown result type');
        }
      }
    })().catch((e) => {
      console.error(e);
      res.statusCode = 500;
      res.end('500');
    });
  }

  private async routeNotFound(
    req: http.IncomingMessage,
    res: http.ServerResponse,
  ): Promise<void> {
    const runAsync = (middleware: HttpRawMiddleware): Promise<void> => {
      return new Promise((resolve) => {
        middleware(req, res, () => {
          resolve();
        });
      });
    };

    for (const middleware of this.rawMiddlewares) {
      await runAsync(middleware);
    }

    console.log('404', req.url, this.rawMiddlewares);

    res.statusCode = 404;
    res.end('404');
  }

  listen(port: number): Promise<void> {
    return new Promise((resolve) => {
      this.server.listen(port, () => {
        resolve();
      });
    });
  }

  getRoutingByMethod(method: HttpMethod): Routing<HttpHandler> | undefined {
    switch (method) {
      case HttpMethod.GET:
        return this.routesGet;
      case HttpMethod.POST:
        return this.routesPost;
      default: {
        const shouldBeNever: never = method;
        return undefined;
      }
    }
  }

  addRawMiddleware(middleware: HttpRawMiddleware): void {
    this.rawMiddlewares.push(middleware);
  }
}
