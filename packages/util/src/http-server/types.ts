import {IncomingMessage, ServerResponse} from 'http';

export const enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
}

export const enum HttpResultType {
  json = 'json',
  html = 'html',
}

export type HttpResult = {statusCode?: number} & (
  | {
      type: HttpResultType.json;
      data: Record<string, unknown>;
    }
  | {type: HttpResultType.html; html: string}
);

export type HttpHandlerOptions = {
  req: IncomingMessage;
  url: string;
  path: string;
  rawQuery: string | undefined;
};

export type HttpHandler = {
  handler: (options: HttpHandlerOptions) => Promise<HttpResult>;
};

export type HttpRawMiddleware = (
  req: IncomingMessage,
  res: ServerResponse,
  next?: () => void,
) => void;
