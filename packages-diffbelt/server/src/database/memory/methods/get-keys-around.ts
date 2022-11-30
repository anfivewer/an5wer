import {
  CollectionGetKeysAroundOptions,
  CollectionGetKeysAroundResult,
} from '@-/diffbelt-types/src/database/types';
import {goNextKey, goPrevKey} from '../../../util/database/traverse/key';
import {searchPhantomInCurrentKey} from '../../../util/database/traverse/phantom';
import {
  createMemoryStorageTraverser,
  MemoryStorageTraverser,
  TraverserInitialItemNotFoundError,
} from '../storage';
import {MemoryDatabaseStorage} from '../types';

export const getKeysAround = ({
  requestOptions: {
    key,
    requireKeyExistance,
    generationId: requiredGenerationId,
    phantomId,
    limit,
  },
  currentGenerationId,
  storage,
}: {
  requestOptions: CollectionGetKeysAroundOptions;
  currentGenerationId: string;
  storage: MemoryDatabaseStorage;
}): Promise<CollectionGetKeysAroundResult> => {
  if (!requireKeyExistance) {
    throw new Error('!requireKeyExistance is not implemented yet');
  }

  const generationId = requiredGenerationId ?? currentGenerationId;

  const getEmptyResponse = () =>
    Promise.resolve({
      generationId,
      hasMoreOnTheLeft: false,
      hasMoreOnTheRight: false,
      left: [],
      right: [],
      foundKey: false,
    });

  let traverser: MemoryStorageTraverser;

  try {
    traverser = createMemoryStorageTraverser({
      storage,
      key,
      exactKey: true,
      generationId,
      phantomId,
    });
  } catch (error) {
    if (error instanceof TraverserInitialItemNotFoundError) {
      return getEmptyResponse();
    }

    throw error;
  }

  const leftTraverser = createMemoryStorageTraverser({
    storage,
    initialPos: traverser.getIndex(),
  }).api;
  const rightTraverser = createMemoryStorageTraverser({
    storage,
    initialPos: traverser.getIndex(),
  }).api;

  const left: string[] = [];
  const right: string[] = [];
  let hasMoreOnTheLeft = true;
  let hasMoreOnTheRight = true;

  while (true) {
    const foundKey = goPrevKey({api: leftTraverser});
    if (!foundKey) {
      hasMoreOnTheLeft = false;
      break;
    }

    const foundGeneration = searchPhantomInCurrentKey({
      api: leftTraverser,
      generationId,
      phantomId,
    });
    if (!foundGeneration) {
      continue;
    }

    const record = leftTraverser.getItem();
    if (record.value === null) {
      continue;
    }

    if (left.length >= limit) {
      // Check late to be precise on `hasMoreOnTheLeft`
      break;
    }

    left.push(record.key);
  }

  left.reverse();

  while (true) {
    const foundKey = goNextKey({api: rightTraverser});
    if (!foundKey) {
      hasMoreOnTheRight = false;
      break;
    }

    const foundGeneration = searchPhantomInCurrentKey({
      api: rightTraverser,
      generationId,
      phantomId,
    });
    if (!foundGeneration) {
      continue;
    }

    const record = rightTraverser.getItem();
    if (record.value === null) {
      continue;
    }

    if (right.length >= limit) {
      // Check late to be precise on `hasMoreOnTheRight`
      break;
    }

    right.push(record.key);
  }

  return Promise.resolve({
    generationId,
    hasMoreOnTheLeft,
    hasMoreOnTheRight,
    left,
    right,
    foundKey: true,
  });
};
