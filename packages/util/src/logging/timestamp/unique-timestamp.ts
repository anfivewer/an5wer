import {createCustomError} from '@-/types/src/errors/util';

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
    const match = /^(.*)\.(\d{3})$/.exec(value);
    if (!match) {
      throw new TimestampParsingError('cannot parse timestamp');
    }

    const [, isoString, microTicksString] = match;

    const ms = Date.parse(isoString);
    if (!isFinite(ms)) {
      throw new TimestampParsingError('invalid ISO date string');
    }

    this.lastTimeMs = ms;
    this.microTicks = parseInt(microTicksString, 10);
  }
}
