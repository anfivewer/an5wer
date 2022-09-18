import http from 'http';
import {createHttpTerminator, HttpTerminator} from 'http-terminator';
import {Defer} from '../async/defer';
import {Routing} from './routing';
import {
  HttpHandler,
  HttpMethod,
  HttpRawMiddleware,
  HttpResultType,
} from './types';

export class HttpServer {
  private server: http.Server;
  private serverTerminator: HttpTerminator;
  private rawMiddlewares: HttpRawMiddleware[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly routesGet: Routing<HttpHandler<any>> = new Routing();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly routesPost: Routing<HttpHandler<any>> = new Routing();

  constructor() {
    this.server = http.createServer(this.handleRequest.bind(this));
    this.serverTerminator = createHttpTerminator({server: this.server});
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
        await this.routeNotFound(req, res);
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
        groups: (handler.data.mapGroups?.(handler.regexpGroups) ??
          handler.regexpGroups) as string[],
        getHeader: (name) => {
          const value = req.headers[name];
          if (!value) {
            return undefined;
          }

          if (Array.isArray(value)) {
            return value[0];
          }

          return value;
        },
        getHeaders: () => req.headers,
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
        case HttpResultType.stream:
          result.stream.pipe(res);
          break;
        case HttpResultType.raw:
          res.end(result.data);
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

  stop(): Promise<void> {
    return this.serverTerminator.terminate();
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
