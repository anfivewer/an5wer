import {IncomingMessage, ServerResponse} from 'http';
import {Readable} from 'stream';

export const enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
}

export const enum HttpResultType {
  json = 'json',
  html = 'html',
  stream = 'stream',
  raw = 'raw',
}

export type HttpHeaders = Record<string, string | string[] | undefined>;

export type HttpResult = {statusCode?: number; headers?: HttpHeaders} & (
  | {
      type: HttpResultType.json;
      data: Record<string, unknown>;
    }
  | {type: HttpResultType.html; html: string}
  | {type: HttpResultType.stream; stream: Readable}
  | {
      type: HttpResultType.raw;
      data: string;
    }
);

export type HttpHandlerOptions<Groups = unknown> = {
  req: IncomingMessage;
  url: string;
  path: string;
  rawQuery: string | undefined;
  groups: Groups;
  getHeader: (name: string) => string | undefined;
  getHeaders: () => HttpHeaders;
};

type HttpHandlerWithGroups<Groups> = {
  mapGroups: (groups: string[]) => Groups;
  handler: (options: HttpHandlerOptions<Groups>) => Promise<HttpResult>;
};

export type HttpHandler<Groups = unknown> =
  | HttpHandlerWithGroups<Groups>
  | {
      mapGroups?: never;
      handler: (options: HttpHandlerOptions<string[]>) => Promise<HttpResult>;
    };

export const createHttpHandler = <Groups>(
  handler: HttpHandlerWithGroups<Groups>,
): HttpHandlerWithGroups<Groups> => handler;

export type HttpRawMiddleware = (
  req: IncomingMessage,
  res: ServerResponse,
  next: () => void,
) => void;
