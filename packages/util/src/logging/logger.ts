import {
  Logger as LoggerInterface,
  LogLevel,
  logLevelToLetter,
} from '@-/types/src/logging/logging';
import {UniqueTimestamp} from './timestamp/unique-timestamp';

type LoggerWithFork = LoggerInterface & {fork: (key: string) => LoggerWithFork};
type LogFn = (
  loggerOpts: {loggerKey?: string; level: LogLevel},
  key: string,
  props?: Record<string, string | number | boolean | undefined | null>,
  extra?: {extra?: unknown; error?: unknown},
) => void;
type FilterLogFn = (...params: Parameters<LogFn>) => boolean;

const getTrue = () => true;

export class Logger implements LoggerInterface {
  private timestamp = new UniqueTimestamp();
  private key: string;
  private logLevel: LogLevel;
  private filterLog: FilterLogFn = getTrue;
  private isDebug = false;

  constructor(
    key: string,
    {
      logLevel = LogLevel.TRACE,
      debug = false,
      filter,
    }: {logLevel?: LogLevel; debug?: boolean; filter?: FilterLogFn} = {},
  ) {
    this.key = key;
    this.logLevel = logLevel;
    this.isDebug = debug;

    if (filter) {
      this.filterLog = filter;
    }
  }

  private log: LogFn = (
    loggerOpts: {loggerKey?: string; level: LogLevel},
    key: string,
    props?: Record<string, string | number | boolean | undefined | null>,
    extraOpts = {},
  ): void => {
    const {loggerKey = this.key, level} = loggerOpts;
    const {extra, error} = extraOpts;

    if (
      level < this.logLevel ||
      !this.filterLog(loggerOpts, key, props, extraOpts)
    ) {
      return;
    }

    const logString = `${logLevelToLetter(
      level,
    )} ${this.timestamp.getNowString()} ${escapeKey(loggerKey)} ${escapeKey(
      key,
    )} ${props ? propsToStringWithSpaceAfter(props) : ''}${
      error ? `|${exceptionToString(error, this.isDebug)}` : ''
    }${extra ? `|${extraToString(extra, this.isDebug)}` : ''}\n`;

    process.stdout.write(logString);
  };

  trace: LoggerInterface['trace'] = this.log.bind(this, {
    loggerKey: undefined,
    level: LogLevel.TRACE,
  });
  info: LoggerInterface['info'] = this.log.bind(this, {
    loggerKey: undefined,
    level: LogLevel.INFO,
  });
  warning: LoggerInterface['warning'] = this.log.bind(this, {
    loggerKey: undefined,
    level: LogLevel.WARNING,
  });
  error: LoggerInterface['error'] = this.log.bind(this, {
    loggerKey: undefined,
    level: LogLevel.ERROR,
  });
  stats: LoggerInterface['stats'] = this.log.bind(this, {
    loggerKey: undefined,
    level: LogLevel.STATS,
  });

  fork = (key: string): LoggerWithFork => {
    const constructFork = (key: string): LoggerWithFork => {
      return {
        trace: this.log.bind(this, {
          loggerKey: `${this.key}:${key}`,
          level: LogLevel.TRACE,
        }),
        info: this.log.bind(this, {
          loggerKey: `${this.key}:${key}`,
          level: LogLevel.INFO,
        }),
        warning: this.log.bind(this, {
          loggerKey: `${this.key}:${key}`,
          level: LogLevel.WARNING,
        }),
        error: this.log.bind(this, {
          loggerKey: `${this.key}:${key}`,
          level: LogLevel.ERROR,
        }),
        stats: this.log.bind(this, {
          loggerKey: `${this.key}:${key}`,
          level: LogLevel.STATS,
        }),
        fork: (nextKey) => {
          return constructFork(`${this.key}:${key}:${nextKey}`);
        },
      };
    };

    return constructFork(key);
  };

  setKey = (key: string): void => {
    this.key = key;
  };

  setDebug(debug: boolean) {
    this.isDebug = debug;
  }
}

const propsToStringWithSpaceAfter = (
  props: Record<string, string | number | boolean | undefined | null>,
): string => {
  let result = '';

  for (const [key, value] of Object.entries(props)) {
    result += `${escapePropKey(key)}:${escapeKey(String(value))} `;
  }

  return result;
};

const exceptionToString = (rawError: unknown, isDebug: boolean): string => {
  const error =
    rawError instanceof Error ? rawError : new Error(String(rawError));

  if (error.stack) {
    return escapeExtra(error.stack, isDebug);
  }

  return escapeExtra(error.toString(), isDebug);
};

const extraToString = (extra: unknown, isDebug: boolean): string => {
  if (isDebug) {
    return JSON.stringify(extra, null, '\t');
  }

  return escapeExtra(JSON.stringify(extra), isDebug);
};

const escapePropKey = (key: string): string => {
  return key.replace(/(?=\\|\s|:)()/g, '\\$1');
};
export const unescapePropKey = (str: string): string => {
  return str.replace(/\\(\\|\s|:)/, '$1');
};

const escapeKey = (key: string): string => {
  return key.replace(/(?=\\|\s)()/g, '\\$1');
};
export const unescapeKey = (str: string): string => {
  return str.replace(/\\(\\|\s)/, '$1');
};

const escapeExtra = (text: string, isDebug: boolean): string => {
  if (isDebug) {
    return text;
  }

  return text
    .replace(/(?=\\|\|)()/g, '\\$1')
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n');
};
export const unescapeExtra = (str: string): string => {
  return str
    .replace(/\\r/g, '\r')
    .replace(/\\n/g, '\n')
    .replace(/\\(\\|\|)/, '$1');
};
