import {TraverserApi} from './types';

/** returns `false` if there is no prev key */
export const goPrevKey = ({api}: {api: TraverserApi}): boolean => {
  const {key} = api.getItem();

  while (true) {
    const item = api.peekPrev();
    if (item === null) {
      return false;
    }

    api.goPrev();

    if (item.key !== key) {
      return true;
    }
  }
};

/** returns `false` if there is no next key */
export const goNextKey = ({api}: {api: TraverserApi}): boolean => {
  const {key} = api.getItem();

  while (true) {
    const item = api.peekNext();
    if (item === null) {
      return false;
    }

    api.goNext();

    if (item.key !== key) {
      return true;
    }
  }
};

export const goToFirstRecordInCurrentKey = ({
  api,
}: {
  api: TraverserApi;
}): void => {
  const {key} = api.getItem();
  goPrevKey({api});
  const {key: newKey} = api.getItem();

  if (key === newKey) {
    // `goPrevKey()` did nothing, so we are at the end
    return;
  }

  api.goNext();
};

export const goToLastRecordInCurrentKey = ({
  api,
}: {
  api: TraverserApi;
}): void => {
  const {key} = api.getItem();
  goNextKey({api});
  const {key: newKey} = api.getItem();

  if (key === newKey) {
    // `goNextKey()` did nothing, so we are at the end
    return;
  }

  api.goPrev();
};
