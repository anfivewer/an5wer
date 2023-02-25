import {EncodedValue, EncodingType} from '@-/diffbelt-types/src/database/types';

export const toString = (key: EncodedValue): string => {
  if (!key.encoding || key.encoding === 'utf8') {
    return key.value;
  }

  return Buffer.from(key.value, 'base64').toString('utf8');
};

export const toBase64Value = (key: EncodedValue): EncodedValue => {
  if (key.encoding === 'base64') {
    return key;
  }

  return {
    encoding: 'base64',
    value: Buffer.from(key.value, 'utf8').toString('base64'),
  };
};

export function assertUtf8Encoding(
  encoding: EncodingType | undefined,
): asserts encoding is typeof EncodingType.base64 | undefined {
  if (!encoding || encoding === EncodingType.base64) {
    return;
  }

  throw new Error('encoding is not utf8');
}

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
