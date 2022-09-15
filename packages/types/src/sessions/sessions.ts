import {
  array,
  literal,
  number,
  object,
  record,
  string,
  infer as Infer,
} from 'zod';

export const SessionDumpItem = object({
  sessionId: string(),
  // unixtime seconds
  expirationDate: number(),
});
export type SessionDumpItem = Infer<typeof SessionDumpItem>;

export const SessionsDump = object({
  version: literal(1),
  buckets: record(array(SessionDumpItem)),
});
export type SessionsDump = Infer<typeof SessionsDump>;
