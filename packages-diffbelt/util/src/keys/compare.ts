import {EncodedValue, EncodingType} from '@-/diffbelt-types/src/database/types';

const toBase64 = (s: string): string =>
  Buffer.from(s, 'utf8').toString('base64');

export const isEqual = (a: EncodedValue, b: EncodedValue) => {
  if (a.encoding === b.encoding) {
    return a.value === b.value;
  }

  const aBase64 = a.encoding === 'base64' ? a.value : toBase64(a.value);
  const bBase64 = b.encoding === 'base64' ? b.value : toBase64(b.value);

  return aBase64 === bBase64;
};

const toBytes = ({value, encoding}: EncodedValue): Buffer => {
  if (encoding === 'base64') {
    return Buffer.from(value, 'base64');
  }

  return Buffer.from(value, 'utf-8');
};

export const isLessThan = (a: EncodedValue, b: EncodedValue) => {
  return Buffer.compare(toBytes(a), toBytes(b)) < 0;
};

export const isGreaterThan = (a: EncodedValue, b: EncodedValue) => {
  return Buffer.compare(toBytes(a), toBytes(b)) > 0;
};

export const isGreaterOrEqualThan = (a: EncodedValue, b: EncodedValue) => {
  return Buffer.compare(toBytes(a), toBytes(b)) >= 0;
};

export const basicCompareKey = (a: EncodedValue, b: EncodedValue) => {
  return Buffer.compare(toBytes(a), toBytes(b));
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
