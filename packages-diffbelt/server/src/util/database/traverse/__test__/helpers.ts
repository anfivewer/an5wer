import {KeyValueRecord} from '@-/diffbelt-types/src/database/types';

export const createSameKeyRecords = ({
  key,
  generations,
  prependKey,
  appendKey,
}: {
  key: string;
  generations: string[];
  prependKey?: string;
  appendKey?: string;
}): KeyValueRecord[] => {
  const result: KeyValueRecord[] = [];

  if (typeof prependKey === 'string') {
    result.push({
      key: prependKey,
      keyEncoding: undefined,
      generationId: '0',
      value: '42',
      valueEncoding: undefined,
      phantomId: undefined,
    });
  }

  generations.forEach((generationId) => {
    const record: KeyValueRecord = {
      key,
      keyEncoding: undefined,
      generationId,
      value: '42',
      valueEncoding: undefined,
      phantomId: undefined,
    };

    result.push(record);
  });

  if (typeof appendKey === 'string') {
    result.push({
      key: appendKey,
      keyEncoding: undefined,
      generationId: '0',
      value: '42',
      valueEncoding: undefined,
      phantomId: undefined,
    });
  }

  return result;
};
