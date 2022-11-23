import {
  CannotPutInManualCollectionError,
  NextGenerationIsNotStartedError,
  OutdatedGenerationError,
} from '@-/diffbelt-types/src/database/errors';
import {Collection} from '@-/diffbelt-types/src/database/types';
import {assertNonNullable} from '@-/types/src/assert/runtime';
import {goToInsertPosition} from '../../../util/database/traverse/insertion';
import {createMemoryStorageTraverser} from '../storage';
import {CreateMethodOptions} from './types';

export const createPutMethod =
  ({
    isManual,
    getNextGeneration,
    getStorage,
    scheduleNonManualCommit,
  }: CreateMethodOptions): Collection['put'] =>
  ({key, value, ifNotPresent = false, generationId, phantomId}) => {
    const nextGeneration = getNextGeneration();
    const storage = getStorage();

    if (typeof generationId === 'string') {
      if (
        !nextGeneration ||
        generationId !== nextGeneration.getGenerationId()
      ) {
        throw new OutdatedGenerationError();
      }
    } else if (isManual) {
      throw new CannotPutInManualCollectionError();
    } else if (!nextGeneration) {
      throw new NextGenerationIsNotStartedError();
    }

    const recordGenerationId: string =
      generationId ?? nextGeneration.getGenerationId();
    assertNonNullable(recordGenerationId, 'put');

    if (!storage.length) {
      nextGeneration.addKey(key);
      scheduleNonManualCommit();
      storage.push({
        key,
        value,
        generationId: recordGenerationId,
        phantomId,
      });
      return Promise.resolve({generationId: recordGenerationId});
    }

    const {api, getIndex} = createMemoryStorageTraverser({
      storage,
      key,
      exactKey: false,
      generationId: recordGenerationId,
    });

    const place = goToInsertPosition({
      api,
      key,
      generationId: recordGenerationId,
      phantomId,
    });

    if (place === 0) {
      if (ifNotPresent) {
        const {generationId: itemGenerationId} = storage[getIndex()];
        return Promise.resolve({generationId: itemGenerationId});
      }

      nextGeneration.addKey(key);
      storage[getIndex()].value = value;
    } else {
      const index = getIndex() + (place < 0 ? 0 : 1);

      if (ifNotPresent) {
        const itemGenerationId = (() => {
          // Insert position only can be at item itself or be next to it,
          // so check current index and the previous one
          const checkItemPresent = (index: number): string | undefined => {
            const {key: itemKey, generationId: itemGenerationId} =
              storage[index];

            return itemKey === key && itemGenerationId <= recordGenerationId
              ? itemGenerationId
              : undefined;
          };

          return (
            (index < storage.length ? checkItemPresent(index) : undefined) ??
            (index >= 1 ? checkItemPresent(index - 1) : undefined)
          );
        })();

        if (typeof itemGenerationId === 'string') {
          return Promise.resolve({generationId: itemGenerationId});
        }
      }

      nextGeneration.addKey(key);
      storage.splice(index, 0, {
        key,
        value,
        generationId: recordGenerationId,
        phantomId,
      });
    }

    scheduleNonManualCommit();

    return Promise.resolve({generationId: recordGenerationId});
  };
