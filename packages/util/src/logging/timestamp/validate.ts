import {TimestampParsingError} from './unique-timestamp';

export const parseTimestamp = (value: string) => {
  const match = /^(.*)\.(\d{3})$/.exec(value);
  if (!match) {
    throw new TimestampParsingError('cannot parse timestamp');
  }

  const [, isoString, microTicksString] = match;

  const ms = Date.parse(isoString);
  if (!isFinite(ms)) {
    throw new TimestampParsingError('invalid ISO date string');
  }

  return {
    timestampMs: ms,
    microTicks: parseInt(microTicksString, 10),
  };
};

export const validateTimestamp = (value: string): boolean => {
  try {
    parseTimestamp(value);
  } catch (error) {
    if (error instanceof TimestampParsingError) {
      return false;
    }

    throw error;
  }

  return true;
};
