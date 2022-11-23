import {KeyValueRecord} from '@-/diffbelt-types/src/database/types';
import {TraverserApi, TraverserApiMarker} from './types';

const searchPhantomBackwardInCurrentKey = ({
  api,
  generationId,
  phantomId,
}: {
  api: TraverserApi;
  generationId: string;
  phantomId: string;
}): boolean => {
  const {
    key,
    generationId: itemGenerationId,
    phantomId: itemPhantomId,
  } = api.getItem();

  let currentGenerationId = itemGenerationId;
  let currentPhantomId = itemPhantomId;

  while (true) {
    if (
      currentGenerationId <= generationId &&
      (currentPhantomId === undefined || currentPhantomId === phantomId)
    ) {
      return true;
    }

    const prevItem = api.peekPrev();
    if (prevItem === null || prevItem.key !== key) {
      return false;
    }

    currentGenerationId = prevItem.generationId;
    currentPhantomId = prevItem.phantomId;
    api.goPrev();
  }
};

const searchPhantomForwardInCurrentKey = ({
  api,
  generationId,
  phantomId,
}: {
  api: TraverserApi;
  generationId: string;
  phantomId: string;
}): boolean => {
  const initialItem = api.getItem();
  const {key} = initialItem;

  let lastSuitableMarker: TraverserApiMarker | null = null;

  const updateLastSuitableMarker = (item: KeyValueRecord) => {
    if (
      item.generationId <= generationId &&
      (item.phantomId === undefined || item.phantomId === phantomId)
    ) {
      lastSuitableMarker = api.getMarker();
    }
  };

  updateLastSuitableMarker(initialItem);

  while (true) {
    const nextItem = api.peekNext();
    if (
      nextItem === null ||
      nextItem.key !== key ||
      nextItem.generationId > generationId ||
      (nextItem.generationId === generationId &&
        nextItem.phantomId !== undefined &&
        nextItem.phantomId > phantomId)
    ) {
      if (lastSuitableMarker !== null) {
        api.goMarker(lastSuitableMarker);
        return true;
      }

      return false;
    }

    updateLastSuitableMarker(nextItem);
    api.goNext();
  }
};

/**
 * returns `false` if there is no records
 * <= than `generationId` possible with === `phantomId`
 */
export const searchPhantomInCurrentKey = ({
  api,
  generationId,
  phantomId,
}: {
  api: TraverserApi;
  generationId: string;
  phantomId: string;
}): boolean => {
  const {generationId: itemGenerationId} = api.getItem();

  if (itemGenerationId > generationId) {
    return searchPhantomBackwardInCurrentKey({api, generationId, phantomId});
  }

  const marker = api.getMarker();
  const foundForwards = searchPhantomForwardInCurrentKey({
    api,
    generationId,
    phantomId,
  });

  if (foundForwards) {
    return true;
  }

  api.goMarker(marker);

  return searchPhantomBackwardInCurrentKey({api, generationId, phantomId});
};

/**
 * returns `false` if there is no non-phantom records in current generation
 */
export const goBackwardToNonPhantomRecordInCurrentGeneration = ({
  api,
}: {
  api: TraverserApi;
}): boolean => {
  const {
    key,
    generationId: itemGenerationId,
    phantomId: itemPhantomId,
  } = api.getItem();

  while (true) {
    if (itemPhantomId === undefined) {
      return true;
    }

    const prevItem = api.peekPrev();
    if (
      !prevItem ||
      prevItem.key !== key ||
      prevItem.generationId !== itemGenerationId
    ) {
      return false;
    }

    api.goPrev();
  }
};

/**
 * returns `false` if there is no phantoms
 */
export const goForwardToLastPhantomRecordInCurrentGeneration = ({
  api,
}: {
  api: TraverserApi;
}): boolean => {
  const {
    key,
    generationId: itemGenerationId,
    phantomId: itemPhantomId,
  } = api.getItem();

  let hasPhantom = itemPhantomId !== undefined;

  while (true) {
    const nextItem = api.peekNext();
    if (
      !nextItem ||
      nextItem.key !== key ||
      nextItem.generationId !== itemGenerationId
    ) {
      return hasPhantom;
    }

    hasPhantom = nextItem.phantomId !== undefined;
    api.goNext();
  }
};

const goBackwardToPhantomInsertPositionInCurrentGeneration = ({
  api,
  phantomId,
}: {
  api: TraverserApi;
  phantomId: string;
}): -1 | 0 | 1 => {
  const {
    key,
    generationId: itemGenerationId,
    phantomId: itemPhantomId,
  } = api.getItem();

  let currentPhantomId = itemPhantomId;

  while (true) {
    if (currentPhantomId === phantomId) {
      return 0;
    }

    const prevItem = api.peekPrev();
    if (
      !prevItem ||
      prevItem.key !== key ||
      prevItem.generationId !== itemGenerationId ||
      prevItem.phantomId === undefined ||
      prevItem.phantomId < phantomId
    ) {
      return -1;
    }

    currentPhantomId = prevItem.phantomId;
    api.goPrev();
  }
};

const goForwardToPhantomInsertPositionInCurrentGeneration = ({
  api,
  phantomId,
}: {
  api: TraverserApi;
  phantomId: string;
}): -1 | 0 | 1 => {
  const {
    key,
    generationId: itemGenerationId,
    phantomId: itemPhantomId,
  } = api.getItem();

  let currentPhantomId = itemPhantomId;

  while (true) {
    if (currentPhantomId === phantomId) {
      return 0;
    }

    const nextItem = api.peekNext();
    if (
      !nextItem ||
      nextItem.key !== key ||
      nextItem.generationId !== itemGenerationId ||
      nextItem.phantomId === undefined ||
      nextItem.phantomId > phantomId
    ) {
      return 1;
    }

    currentPhantomId = nextItem.phantomId;
    api.goNext();
  }
};

/**
 * Returns:
 *
 * -  0 -- key&generationId already exists, replace current index
 * - -1 -- should be inserted at current index
 * -  1 -- should be inserted after index (end of items)
 */
export const goToPhantomInsertPositionInCurrentGeneration = ({
  api,
  phantomId,
}: {
  api: TraverserApi;
  phantomId: string;
}): -1 | 0 | 1 => {
  const {phantomId: itemPhantomId} = api.getItem();

  if (itemPhantomId === phantomId) {
    return 0;
  }

  if (itemPhantomId === undefined || itemPhantomId < phantomId) {
    return goForwardToPhantomInsertPositionInCurrentGeneration({
      api,
      phantomId,
    });
  }

  return goBackwardToPhantomInsertPositionInCurrentGeneration({api, phantomId});
};
