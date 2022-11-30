import {KeyValueRecord} from '@-/diffbelt-types/src/database/types';
import {goPrevKey} from './key';
import {TraverserApi} from './types';

/** returns `false` if there is no next generation */
export const goNextGenerationInCurrentKey = ({
  api,
}: {
  api: TraverserApi;
}):
  | {found: true; isEnd?: never; item: KeyValueRecord}
  | {found: false; isEnd: boolean} => {
  const {key, generationId} = api.getItem();

  while (true) {
    const item = api.peekNext();
    if (item === null) {
      return {found: false, isEnd: true};
    }

    if (item.key !== key) {
      return {found: false, isEnd: false};
    }

    api.goNext();

    if (item.generationId !== generationId) {
      return {found: true, item};
    }
  }
};

/** returns `false` if there is no records <= than `generationId` */
const searchGenerationBackwardInCurrentKey = ({
  api,
  generationId,
}: {
  api: TraverserApi;
  generationId: string;
}): boolean => {
  const {key, generationId: itemGenerationId} = api.getItem();

  let currentGenerationId = itemGenerationId;

  while (true) {
    if (currentGenerationId <= generationId) {
      return true;
    }

    const prevItem = api.peekPrev();
    if (prevItem === null || prevItem.key !== key) {
      return false;
    }

    currentGenerationId = prevItem.generationId;
    api.goPrev();
  }
};

/** returns `false` if there is no records <= than `generationId` */
const searchGenerationForwardInCurrentKey = ({
  api,
  generationId,
}: {
  api: TraverserApi;
  generationId: string;
}): boolean => {
  const {key, generationId: itemGenerationId} = api.getItem();

  let currentGenerationId = itemGenerationId;
  let currentIsSuitable = itemGenerationId <= generationId;

  while (true) {
    if (currentGenerationId === generationId) {
      return true;
    }

    const nextItem = api.peekNext();
    if (
      nextItem === null ||
      nextItem.key !== key ||
      nextItem.generationId > generationId
    ) {
      return currentIsSuitable;
    }

    currentGenerationId = nextItem.generationId;
    currentIsSuitable = currentGenerationId <= generationId;
    api.goNext();
  }
};

/** returns `false` if there is no records <= than `generationId` */
export const searchGenerationInCurrentKey = ({
  api,
  generationId,
}: {
  api: TraverserApi;
  /** `null` means initial generation */
  generationId: string | null;
}): boolean => {
  if (generationId === null) {
    const hasPrevKey = goPrevKey({api});
    if (hasPrevKey) {
      // Since we are moved to prev key, go back to our key
      api.goNext();
    }

    return true;
  }

  const {generationId: itemGenerationId} = api.getItem();

  if (itemGenerationId === generationId) {
    return true;
  }

  if (itemGenerationId > generationId) {
    return searchGenerationBackwardInCurrentKey({api, generationId});
  }

  return searchGenerationForwardInCurrentKey({api, generationId});
};
