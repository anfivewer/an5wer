import {
  TimestampParsingError,
  UniqueTimestamp,
} from '@-/util/src/logging/timestamp/unique-timestamp';

export type NormalizedLogLine = string & {
  readonly NormalizedLogLine: unique symbol;
};

export class LinesNormalizer {
  private lastTimestamp = new UniqueTimestamp();

  normalizeLine(line: string): NormalizedLogLine {
    let validTimestamp = false;

    const line2 = line.replace(
      /^(?:\[[^\]]+\]\s+)?([A-Z])\s+([^\s]+)(.+)/,
      (full, type, timestamp, rest) => {
        try {
          this.lastTimestamp.setLastTimestampFromString(timestamp);
        } catch (error) {
          if (error instanceof TimestampParsingError) {
            return full;
          }

          throw error;
        }

        validTimestamp = true;

        return `${timestamp} ${type}${rest}`;
      },
    );

    if (!validTimestamp) {
      return `${this.lastTimestamp.getNextString()} ${line}` as NormalizedLogLine;
    }

    return line2 as NormalizedLogLine;
  }
}

/*
[Kicker] T 2022-10-28T20:53:42.699Z.000 kicker checkCandidates checking:false
*/
