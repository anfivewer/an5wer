import {EncodedKey, EncodingType} from '@-/diffbelt-types/src/database/types';

const toBase64 = (s: string): string =>
  Buffer.from(s, 'utf8').toString('base64');

export const toBase64Key = (key: EncodedKey): EncodedKey => {
  if (key.encoding === 'base64') {
    return key;
  }

  return {
    encoding: 'base64',
    key: Buffer.from(key.key, 'utf8').toString('base64'),
  };
};

export const isLessThan = (a: EncodedKey, b: EncodedKey) => {
  if (a.encoding === b.encoding) {
    return a.key < b.key;
  }

  const aBase64 = a.encoding === 'base64' ? a.key : toBase64(a.key);
  const bBase64 = b.encoding === 'base64' ? b.key : toBase64(b.key);

  return aBase64 < bBase64;
};

export const isGreaterThan = (a: EncodedKey, b: EncodedKey) => {
  if (a.encoding === b.encoding) {
    return a.key > b.key;
  }

  const aBase64 = a.encoding === 'base64' ? a.key : toBase64(a.key);
  const bBase64 = b.encoding === 'base64' ? b.key : toBase64(b.key);

  return aBase64 > bBase64;
};

export const basicCompareKey = (a: EncodedKey, b: EncodedKey) => {
  if (a.encoding === b.encoding) {
    if (a.key < b.key) return -1;
    if (a.key > b.key) return 1;
    return 0;
  }

  const aBase64 = a.encoding === 'base64' ? a.key : toBase64(a.key);
  const bBase64 = b.encoding === 'base64' ? b.key : toBase64(b.key);

  if (aBase64 < bBase64) return -1;
  if (bBase64 > aBase64) return 1;
  return 0;
};

function _typeChecks(encoding: EncodingType) {
  switch (encoding) {
    case 'utf8':
    case 'base64':
      break;
    default: {
      const shouldBeNever: never = encoding;
    }
  }
}
