import {ParsedLogLine} from '@-/types/src/logging/parsed-log';
import {
  letterToLogLevel,
  LogLevel,
  logLevelToLetter,
} from '@-/types/src/logging/logging';
import {unescapeExtra, unescapeKey, unescapePropKey} from './logger';
import {createCustomError} from '@-/types/src/errors/util';

const LOG_LEVEL_PATTERN = '(T|I|W|E|S)';
// WARN: contains 2 groups
const TIMESTAMP_PATTERN =
  '(\\d{4}-\\d\\d-\\d\\dT\\d\\d:\\d\\d:\\d\\d\\.\\d{1,3}Z)\\.(\\d{1,3})';

const ENTRY_PATTERN =
  `^(?:${LOG_LEVEL_PATTERN} ${TIMESTAMP_PATTERN}` +
  `|${TIMESTAMP_PATTERN} ${LOG_LEVEL_PATTERN})`;
const END_PATTERN = ' ((?:\\\\ |[^\\s])+) ((?:\\\\ |[^\\s])+)(.*)$';

const LOG_LINE_REGEXP = new RegExp(`${ENTRY_PATTERN}${END_PATTERN}`);

export const LogLineNotParsed = createCustomError('LogLineNotParsed');

export const maybeParseLogLine = (line: string): ParsedLogLine | null => {
  try {
    return parseLogLine(line);
  } catch (error) {
    if (!(error instanceof LogLineNotParsed)) {
      throw error;
    }
  }

  return null;
};

export const parseLogLine = (line: string): ParsedLogLine => {
  const match = LOG_LINE_REGEXP.exec(line);

  if (!match) {
    throw new LogLineNotParsed('Log line not parsed');
  }

  const [
    ,
    levelLetterA,
    dateStrA,
    microsecondsStrA,
    dateStrB,
    microsecondsStrB,
    levelLetterB,
    loggerKeyEscaped,
    logKeyEscaped,
    propsAndExtraStr,
  ] = match;

  const levelLetter = levelLetterA || levelLetterB;
  const dateStr = dateStrA || dateStrB;
  const microsecondsStr = microsecondsStrA || microsecondsStrB;

  const logLevel = letterToLogLevel(levelLetter);
  if (!logLevel) {
    throw new LogLineNotParsed(`Unknown log level letter: ${levelLetter}`);
  }

  const timestampMilliseconds = new Date(dateStr).getTime();
  const timestampMicroseconds = parseInt(microsecondsStr, 10);

  const {props: propsMap, extra} = parsePropsAndExtra(propsAndExtraStr);

  const props: Record<string, string> = {};
  propsMap.forEach((value, key) => {
    props[key] = value;
  });

  return {
    logLevel,
    logLevelLetter: logLevelToLetter(logLevel),
    timestampString: `${dateStr}.${microsecondsStr}`,
    timestampMilliseconds,
    timestampMicroseconds,
    loggerKey: unescapeKey(loggerKeyEscaped),
    logKey: unescapeKey(logKeyEscaped),
    props,
    extra,
  };
};

const getEmptyPropsAndExtra = () => ({props: new Map(), extra: []});

const parsePropsAndExtra = (
  str: string | undefined,
): {props: Map<string, string>; extra: string[]} => {
  if (!str) {
    return getEmptyPropsAndExtra();
  }

  const props = new Map();

  const regexp = /\s((?:\\ |\\:|[^\s:])+):((?:\\ |[^\s])+)/g;
  let lastIndex = 0;

  while (true) {
    const match = regexp.exec(str);
    if (!match) {
      break;
    }

    if (lastIndex !== match.index) {
      throw new LogLineNotParsed('Failed to parse props');
    }

    lastIndex = regexp.lastIndex;

    const [, escapedPropKey, escapedValue] = match;

    props.set(unescapePropKey(escapedPropKey), unescapeKey(escapedValue));
  }

  return {
    props,
    extra: parseExtra(str.slice(lastIndex + 1)),
  };
};

const parseExtra = (str: string): string[] => {
  const regexp = /\|((?:\\\||[^|])+)/g;
  let lastIndex = 0;

  const extra: string[] = [];

  while (true) {
    const match = regexp.exec(str);
    if (!match) {
      if (lastIndex !== str.length) {
        throw new Error('Failed to parse extra: chars left');
      }
      break;
    }

    if (lastIndex !== match.index) {
      throw new Error('Failed to parse extra');
    }

    lastIndex = regexp.lastIndex;

    const [, escapedExtra] = match;

    extra.push(unescapeExtra(escapedExtra));
  }

  return extra;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _typeCheckLogLevel = (): void => {
  const level: LogLevel = LogLevel.INFO as LogLevel;
  switch (level) {
    case LogLevel.TRACE:
    case LogLevel.INFO:
    case LogLevel.WARNING:
    case LogLevel.ERROR:
    case LogLevel.STATS:
      break;
    default: {
      // If types does not match, fix `parseLogLine` to correctly parse new log level
      const shouldBeNever: never = level;
    }
  }
};
