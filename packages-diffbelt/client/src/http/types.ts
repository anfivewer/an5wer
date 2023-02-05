type JsonObject = {[key: string]: Json};
type JsonArray = Json[];
type Json = JsonObject | JsonArray | number | string | null | boolean;

export type CallApiFn = <T>(options: {
  method: 'GET' | 'POST' | 'DELETE';
  path: string;
  params?: Record<string, string | undefined>;
  body?: JsonObject;
  parser: {parse: (data: unknown) => T};
}) => Promise<T>;
