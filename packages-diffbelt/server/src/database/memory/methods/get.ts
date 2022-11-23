import {Collection} from '@-/diffbelt-types/src/database/types';
import {TraverserApi} from '../../../util/database/traverse/types';
import {
  createMemoryStorageTraverser,
  TraverserInitialItemNotFoundError,
} from '../storage';
import {CreateMethodOptions} from './types';

export const createGetMethod =
  ({getGenerationId, getStorage}: CreateMethodOptions): Collection['get'] =>
  ({key, generationId: requiredGenerationId, phantomId}) => {
    const storage = getStorage();

    let traverser: TraverserApi;
    const generationId = requiredGenerationId ?? getGenerationId();

    try {
      traverser = createMemoryStorageTraverser({
        storage,
        key,
        generationId,
        phantomId,
        exactPhantomId: true,
      }).api;
    } catch (error) {
      if (error instanceof TraverserInitialItemNotFoundError) {
        return Promise.resolve({
          generationId,
          item: null,
        });
      }

      throw error;
    }

    const {value, generationId: itemGenerationId} = traverser.getItem();

    return Promise.resolve({
      generationId: itemGenerationId,
      item: value !== null ? {key, value} : null,
    });
  };
