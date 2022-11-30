export const extractTimestampFromTimestampWithLoggerKey = (
  key: string,
): number => {
  const match = /^([^\s]+)(?:\.\d\d\d\s)|^([^\s]+)/.exec(key);
  if (!match) {
    throw new Error(`Cannot extract timestamp from key: "${key}"`);
  }

  const [, timestampStringA, timestampStringB] = match;

  const timestampString = timestampStringA || timestampStringB;

  const date = new Date(timestampString);
  const timestamp = date.getTime();

  if (!isFinite(timestamp)) {
    throw new Error(`Bad timestamp in a key: "${key}"`);
  }

  return timestamp;
};
