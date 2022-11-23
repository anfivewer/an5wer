import {KeyValueRecord} from '@-/diffbelt-types/src/database/types';
import {createCustomError} from '@-/types/src/errors/util';
import {binarySearch} from '@-/util/src/array/binary-search';
import {findRecordInCurrentKey} from '../../util/database/traverse/record';
import {
  TraverserApi,
  TraverserApiMarker,
} from '../../util/database/traverse/types';
import {MemoryDatabaseStorage} from './types';

type InitialPosProvided = {initialPos: number};
type InitialPosByKey = {
  key: string;
  exactKey?: boolean;
};
const isInitialPosByKey = (
  value: InitialPosSource,
): value is InitialPosByKey => {
  return Boolean((value as Partial<InitialPosByKey>).key);
};

type InitialExactPosByKeyAndGeneration = InitialPosByKey & {
  generationId: string;
  exactGenerationId?: boolean;
};
const isInitialPosByKeyAndGeneration = (
  value: InitialPosSource,
): value is InitialExactPosByKeyAndGeneration => {
  return (
    typeof (value as Partial<InitialExactPosByKeyAndGeneration>)
      .generationId === 'string'
  );
};

type InitialExactPosByKeyGenerationAndPhantom = InitialPosByKey & {
  generationId: string;
  exactGenerationId?: boolean;
  phantomId?: string;
  exactPhantomId?: boolean;
};
const isInitialPosByKeyGenerationAndPhantom = (
  value: InitialPosSource,
): value is InitialExactPosByKeyGenerationAndPhantom => {
  if (!isInitialPosByKeyAndGeneration(value)) {
    return false;
  }

  const casted = value as Partial<InitialExactPosByKeyGenerationAndPhantom>;

  return (
    typeof casted.phantomId === 'string' ||
    typeof casted.exactPhantomId === 'boolean'
  );
};

type InitialPosSource =
  | InitialPosProvided
  | InitialPosByKey
  | InitialExactPosByKeyAndGeneration
  | InitialExactPosByKeyGenerationAndPhantom;

export const TraverserInitialItemNotFoundError = createCustomError(
  'TraverserInitialItemNotFoundError',
);

export type MemoryStorageTraverser = {
  api: TraverserApi;
  getIndex: () => number;
};

type MemoryStorageTraverserMarker = TraverserApiMarker & {
  index: number;
  item: KeyValueRecord;
};

export class MemoryStorageTraverserApi implements TraverserApi {
  private storage: MemoryDatabaseStorage;
  private index: number;

  constructor({
    storage,
    index,
  }: {
    storage: MemoryDatabaseStorage;
    index: number;
  }) {
    this.storage = storage;
    this.index = index;
  }

  getItem() {
    return this.storage[this.index];
  }

  getMarker() {
    return {index: this.index} as MemoryStorageTraverserMarker;
  }

  goMarker(rawMarker: TraverserApiMarker) {
    const {index: markerIndex, item: expectedItem} =
      rawMarker as Partial<MemoryStorageTraverserMarker>;
    if (typeof markerIndex !== 'number' || !expectedItem) {
      throw new Error('MemoryStorageTraverser: bad marker');
    }

    const actualItem = this.storage[markerIndex];
    if (actualItem !== expectedItem) {
      throw new Error(
        'MemoryStorageTraverser: marker invariant violation, storage is changed',
      );
    }

    this.index = markerIndex;
  }

  hasPrev() {
    return this.index > 0;
  }

  peekPrev() {
    return this.index > 0 ? this.storage[this.index - 1] : null;
  }

  goPrev() {
    if (this.index <= 0) {
      throw new Error('MemoryStorageTraverser: no prev item');
    }

    this.index--;
  }

  hasNext() {
    return this.index < this.storage.length - 1;
  }

  peekNext() {
    return this.index < this.storage.length - 1
      ? this.storage[this.index + 1]
      : null;
  }

  goNext() {
    if (this.index >= this.storage.length - 1) {
      throw new Error('MemoryStorageTraverser: no next item');
    }

    this.index++;
  }

  getIndex() {
    return this.index;
  }
}

export const createMemoryStorageTraverser = (
  options: {
    storage: MemoryDatabaseStorage;
  } & InitialPosSource,
): MemoryStorageTraverser => {
  const {storage} = options;

  const result = (() => {
    if (isInitialPosByKey(options)) {
      const {key, exactKey = true} = options;

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
        (api: TraverserApi) => {
          const found = (() => {
            if (isInitialPosByKeyGenerationAndPhantom(options)) {
              const {
                generationId,
                exactGenerationId = false,
                phantomId,
                exactPhantomId = false,
              } = options;
              return findRecordInCurrentKey({
                api,
                generationId,
                exactGenerationId,
                phantomId,
                exactPhantomId,
              });
            }

            if (isInitialPosByKeyAndGeneration(options)) {
              const {generationId, exactGenerationId = false} = options;
              return findRecordInCurrentKey({
                api,
                generationId,
                exactGenerationId,
              });
            }

            // Just by key
            return true;
          })();

          if (!found) {
            throw new TraverserInitialItemNotFoundError(
              'memoryStorageTraverser: initialPos by generationId not found',
            );
          }
        },
      ] as const;
    } else {
      return [options.initialPos, undefined] as const;
    }
  })();

  const index = result[0];
  const postProcess = result[1];

  const api = new MemoryStorageTraverserApi({storage, index});

  postProcess?.(api);

  // TODO: return just `api`
  return {
    api: api as TraverserApi,
    getIndex: api.getIndex.bind(api),
  };
};
