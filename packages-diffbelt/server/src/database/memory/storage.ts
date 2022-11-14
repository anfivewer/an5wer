import {createCustomError} from '@-/types/src/errors/util';
import {binarySearch} from '@-/util/src/array/binary-search';
import {
  createStorageTraverser,
  StorageTraverser,
} from '../../util/database/traverse/storage';
import {MemoryDatabaseStorage} from './types';

type InitialPosProvided = {initialPos: number};
type InitialPosByKey = {
  key: string;
  exactKey?: boolean;
  generationId?: string;
  exactGenerationId?: boolean;
};
const isInitialPosByKey = (
  value: InitialPosSource,
): value is InitialPosByKey => {
  return Boolean((value as Partial<InitialPosByKey>).key);
};

type InitialPosSource = InitialPosProvided | InitialPosByKey;

export const TraverserInitialItemNotFoundError = createCustomError(
  'TraverserInitialItemNotFoundError',
);

export type MemoryStorageTraverser = {
  traverser: StorageTraverser;
  getIndex: () => number;
};

export const createMemoryStorageTraverser = (
  options: {
    storage: MemoryDatabaseStorage;
  } & InitialPosSource,
): MemoryStorageTraverser => {
  const {storage} = options;

  const result = (() => {
    if (isInitialPosByKey(options)) {
      const {key, exactKey = true, generationId, exactGenerationId} = options;

      const pos = binarySearch({
        sortedArray: storage,
        comparator: ({key: itemKey}) => {
          if (key > itemKey) return 1;
          if (key < itemKey) return -1;
          return 0;
        },
        returnInsertPos: !exactKey,
      });

      if (pos < 0) {
        throw new TraverserInitialItemNotFoundError(
          'memoryStorageTraverser: initialPos not found',
        );
      }

      return [
        pos >= storage.length ? storage.length - 1 : pos,
        generationId
          ? (traverser: StorageTraverser) => {
              const found = traverser.findGenerationRecord({
                generationId,
                exact: exactGenerationId,
              });

              if (!found) {
                throw new TraverserInitialItemNotFoundError(
                  'memoryStorageTraverser: initialPos by generationId not found',
                );
              }
            }
          : undefined,
      ] as const;
    } else {
      return [options.initialPos, undefined] as const;
    }
  })();

  let index = result[0];
  const postProcess = result[1];

  const traverser = createStorageTraverser({
    getItem: () => storage[index],
    peekPrev: () => (index > 0 ? storage[index - 1] : null),
    goPrev: () => {
      index--;
    },
    peekNext: () => (index < storage.length - 1 ? storage[index + 1] : null),
    goNext: () => {
      index++;
    },
  });

  postProcess?.(traverser);

  return {
    traverser,
    getIndex: () => index,
  };
};
