import {
  TimestampParsingError,
  UniqueTimestamp,
} from '@-/util/src/logging/timestamp/unique-timestamp';
import {validateTimestamp} from '@-/util/src/logging/timestamp/validate';

export type NormalizedLogLine = string & {
  readonly NormalizedLogLine: unique symbol;
};

export class LinesNormalizer {
  private lastTimestamp = new UniqueTimestamp();

  normalizeLine(line: string): NormalizedLogLine {
    const normalized = normalizeLine(line, {lastTimestamp: this.lastTimestamp});

    if (!normalized) {
      return `${this.lastTimestamp.getNextString()} ${line}` as NormalizedLogLine;
    }

    return normalized;
  }
}

export const normalizeLine = (
  line: string,
  {lastTimestamp}: {lastTimestamp?: UniqueTimestamp} = {},
): NormalizedLogLine | null => {
  let validTimestamp = false;

  const line2 = line.replace(
    /^(?:\[[^\]]+\]\s+)?([A-Z])\s+([^\s]+)(.+)/,
    (full, type, timestamp, rest) => {
      if (lastTimestamp) {
        try {
          lastTimestamp.setLastTimestampFromString(timestamp);
        } catch (error) {
          if (error instanceof TimestampParsingError) {
            return full;
          }

          throw error;
        }

        validTimestamp = true;
      } else {
        validTimestamp = validateTimestamp(timestamp);
      }

      return `${timestamp} ${type}${rest}`;
    },
  );

  if (!validTimestamp) {
    return null;
  }

  return line2.trim() as NormalizedLogLine;
};
