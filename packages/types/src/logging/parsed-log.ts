import {array, nativeEnum, number, object, record, string} from 'zod';
import {ZodInfer} from '../zod/zod';
import {LogLevel} from './logging';

export const ParsedLogLine = object({
  logLevel: nativeEnum(LogLevel),
  timestampMilliseconds: number(),
  timestampMicroseconds: number(),
  loggerKey: string(),
  logKey: string(),
  props: record(string()),
  extra: array(string()),
});
export type ParsedLogLine = ZodInfer<typeof ParsedLogLine>;
