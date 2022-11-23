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
      generationId: '0',
      value: '42',
      phantomId: undefined,
    });
  }

  generations.forEach((generationId) => {
    const record: KeyValueRecord = {
      key,
      generationId,
      value: '42',
      phantomId: undefined,
    };

    result.push(record);
  });

  if (typeof appendKey === 'string') {
    result.push({
      key: appendKey,
      generationId: '0',
      value: '42',
      phantomId: undefined,
    });
  }

  return result;
};
