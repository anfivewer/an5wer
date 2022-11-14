import {array, nativeEnum, number, object, record, string} from 'zod';
import {ZodInfer} from '../zod/zod';
import {LogLevel, LogLevelLetter} from './logging';

export const ParsedLogLine = object({
  logLevel: nativeEnum(LogLevel),
  logLevelLetter: LogLevelLetter,
  timestampString: string(),
  timestampMilliseconds: number(),
  timestampMicroseconds: number(),
  loggerKey: string(),
  logKey: string(),
  props: record(string().optional()),
  extra: array(string()),
});
export type ParsedLogLine = ZodInfer<typeof ParsedLogLine>;
