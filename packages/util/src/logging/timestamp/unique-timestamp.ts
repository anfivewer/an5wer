import {createCustomError} from '@-/types/src/errors/util';
import {parseTimestamp} from './validate';

export const TimestampParsingError = createCustomError('TimestampParsingError');

export class UniqueTimestamp {
  private lastTimeMs = 0;
  private microTicks = 0;
  private date = new Date();

  getNextString(): string {
    this.microTicks++;
    if (this.microTicks >= 1000) {
      this.microTicks = 0;
      this.lastTimeMs++;
    }

    this.date.setTime(this.lastTimeMs);

    return `${this.date.toISOString()}.${String(this.microTicks).padStart(
      3,
      '0',
    )}`;
  }

  getNowString(): string {
    let ms = Date.now();

    if (this.lastTimeMs >= ms) {
      this.microTicks++;
      if (this.microTicks >= 1000) {
        this.microTicks = 0;
        ms++;
      }
    } else {
      this.microTicks = 0;
    }

    this.lastTimeMs = ms;

    this.date.setTime(ms);

    return `${this.date.toISOString()}.${String(this.microTicks).padStart(
      3,
      '0',
    )}`;
  }

  setLastTimestampFromString(value: string): void {
    const {timestampMs, microTicks} = parseTimestamp(value);

    this.lastTimeMs = timestampMs;
    this.microTicks = microTicks;
  }
}
