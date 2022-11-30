import {searchGenerationInCurrentKey} from './generation';
import {goNextKey, goPrevKey} from './key';
import {
  goBackwardToNonPhantomRecordInCurrentGeneration,
  goForwardToLastPhantomRecordInCurrentGeneration,
} from './phantom';
import {TraverserApi} from './types';

const goToInsertPositionInCurrentKey = ({
  api,
  generationId,
  phantomId,
}: {
  api: TraverserApi;
  generationId: string;
  phantomId: string | undefined;
}): -1 | 0 | 1 => {
  const foundGeneration = searchGenerationInCurrentKey({api, generationId});

  if (phantomId === undefined) {
    if (foundGeneration) {
      // `itemGenerationId <= generationId`
      const {generationId: itemGenerationId} = api.getItem();
      if (itemGenerationId === generationId) {
        const foundNonPhantom = goBackwardToNonPhantomRecordInCurrentGeneration(
          {
            api,
          },
        );

        if (foundNonPhantom) {
          return 0;
        }

        return -1;
      }

      // There `itemGenerationId` should be `< generationId`,
      // phantoms are always after actual record,
      // we need to insert our record after phantoms, so skip them
      goForwardToLastPhantomRecordInCurrentGeneration({api});

      return 1;
    }

    // `itemGenerationId > generationId`
    // Skip phantoms, insert before current generation record
    goBackwardToNonPhantomRecordInCurrentGeneration({
      api,
    });

    return -1;
  }

  if (foundGeneration) {
    // `itemGenerationId <= generationId`
    const {
      key,
      generationId: itemGenerationId,
      phantomId: itemPhantomId,
    } = api.getItem();

    if (itemPhantomId === undefined || itemPhantomId <= phantomId) {
      // go forward
      let currentPhantomId = itemPhantomId;

      while (true) {
        if (currentPhantomId === phantomId) {
          return 0;
        }

        const nextItem = api.peekNext();
        if (
          !nextItem ||
          nextItem.phantomId === undefined ||
          nextItem.phantomId > phantomId ||
          nextItem.key !== key ||
          nextItem.generationId !== itemGenerationId
        ) {
          return 1;
        }

        currentPhantomId = nextItem.phantomId;
        api.goNext();
      }
    }

    // go backward
    let currentPhantomId = itemPhantomId;

    while (true) {
      if (currentPhantomId === phantomId) {
        return 0;
      }

      const prevItem = api.peekPrev();
      if (
        !prevItem ||
        prevItem.phantomId === undefined ||
        prevItem.phantomId < phantomId ||
        prevItem.key !== key ||
        prevItem.generationId !== itemGenerationId
      ) {
        return -1;
      }

      currentPhantomId = prevItem.phantomId;
      api.goPrev();
    }
  }

  // itemGenerationId > generationId
  // Skip phantoms, insert before current generation record
  goBackwardToNonPhantomRecordInCurrentGeneration({
    api,
  });

  return -1;
};

/**
 * Returns:
 *
 * -  0 -- key&generationId already exists, replace current index
 * - -1 -- should be inserted at current index
 * -  1 -- should be inserted after index (end of items)
 */
export const goToInsertPosition = ({
  api,
  key,
  generationId,
  phantomId,
}: {
  api: TraverserApi;
  key: string;
  generationId: string;
  phantomId: string | undefined;
}): -1 | 0 | 1 => {
  const {key: itemKey} = api.getItem();

  if (itemKey === key) {
    return goToInsertPositionInCurrentKey({api, generationId, phantomId});
  }

  if (itemKey > key) {
    // backwards
    while (true) {
      const hasPrev = goPrevKey({api});
      if (!hasPrev) {
        return -1;
      }

      const {key: itemKey} = api.getItem();

      if (itemKey < key) {
        return 1;
      }

      if (itemKey === key) {
        return goToInsertPositionInCurrentKey({api, generationId, phantomId});
      }
    }
  }

  // forward
  while (true) {
    const hasNext = goNextKey({api});
    if (!hasNext) {
      return 1;
    }

    const {key: itemKey} = api.getItem();

    if (itemKey < key) {
      return -1;
    }

    if (itemKey === key) {
      return goToInsertPositionInCurrentKey({api, generationId, phantomId});
    }
  }
};
