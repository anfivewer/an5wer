import {KeyValueRecord} from '@-/diffbelt-types/src/database/types';

type StorageTraverserOptions = {
  getItem: () => KeyValueRecord;
  peekPrev: () => KeyValueRecord | null;
  goPrev: () => void;
  peekNext: () => KeyValueRecord | null;
  goNext: () => void;
};

export type StorageTraverser = {
  getItem: () => KeyValueRecord;
  peekPrev: () => KeyValueRecord | null;
  peekNext: () => KeyValueRecord | null;
  findGenerationRecord: (options: {
    generationId: string | null;
    exact?: boolean;
  }) => boolean;
  goPrevKey: () => boolean;
  goNextKey: () => boolean;
  goNextGeneration: () =>
    | {item: KeyValueRecord; found: true}
    | {found: false; isEnd: boolean};
  goToInsertPosition: (options: {
    key: string;
    generationId: string;
    //  0 -- key&generationId already exists, replace current index
    // -1 -- should be inserted at current index
    //  1 -- should be inserted after index (end of items)
  }) => -1 | 0 | 1;
};

export const createStorageTraverser = ({
  getItem,
  peekPrev,
  goPrev,
  peekNext,
  goNext,
}: StorageTraverserOptions): StorageTraverser => {
  const findGenerationRecord: StorageTraverser['findGenerationRecord'] = ({
    generationId,
    exact = false,
  }) => {
    const {key, generationId: itemGenerationId} = getItem();

    if (itemGenerationId === generationId) {
      return true;
    }

    let prevGenerationId = itemGenerationId;

    if (generationId !== null && itemGenerationId < generationId) {
      // go forward
      while (true) {
        const nextItem = peekNext();
        const shouldReturn =
          !nextItem ||
          nextItem.key !== key ||
          nextItem.generationId > generationId;

        if (shouldReturn) {
          return exact ? prevGenerationId === generationId : true;
        }

        prevGenerationId = nextItem.generationId;
        goNext();
      }
    } else {
      // go backward
      while (true) {
        const prevItem = peekPrev();
        const shouldReturn =
          !prevItem ||
          prevItem.key !== key ||
          (generationId !== null && prevItem.generationId < generationId);

        if (shouldReturn) {
          return exact
            ? prevGenerationId === generationId
            : generationId === null || prevGenerationId <= generationId;
        }

        prevGenerationId = prevItem.generationId;
        goPrev();
      }
    }
  };

  const goNextGeneration: StorageTraverser['goNextGeneration'] = () => {
    const {key} = getItem();

    const nextItem = peekNext();
    if (!nextItem) {
      return {found: false, isEnd: true};
    }

    goNext();

    if (nextItem.key !== key) {
      return {found: false, isEnd: false};
    }

    return {found: true, item: nextItem};
  };

  // returns true if moved, false if this is start of items
  const goPrevKey: StorageTraverser['goPrevKey'] = () => {
    const {key} = getItem();

    while (true) {
      const prevItem = peekPrev();
      if (!prevItem) {
        return false;
      }

      goPrev();

      if (prevItem.key !== key) {
        return true;
      }
    }
  };

  const goNextKey: StorageTraverser['goNextKey'] = () => {
    const {key} = getItem();

    while (true) {
      const nextItem = peekNext();
      if (!nextItem) {
        return false;
      }

      goNext();

      if (nextItem.key !== key) {
        return true;
      }
    }
  };

  return {
    getItem,
    peekPrev,
    peekNext,
    findGenerationRecord,
    goPrevKey,
    goNextKey,
    goNextGeneration,
    goToInsertPosition: ({key, generationId}) => {
      let itemKey: string;
      ({key: itemKey} = getItem());

      while (true) {
        if (itemKey === key) {
          findGenerationRecord({generationId});
          const {generationId: itemGenerationId} = getItem();
          if (itemGenerationId === generationId) {
            return 0;
          }

          return 1;
        }

        if (itemKey < key) {
          const hasKey = goNextKey();
          if (!hasKey) {
            // end of items, insert to end
            return 1;
          }

          ({key: itemKey} = getItem());
          if (itemKey > key) {
            // curent key was lesser, this is bigger, so insert before this
            return -1;
          }

          continue;
        }

        // itemKey > key
        const hasKey = goPrevKey();
        if (!hasKey) {
          // start of items, prepend
          return -1;
        }

        ({key: itemKey} = getItem());
        if (itemKey < key) {
          // current key was bigger, this is lesser, so insert after this
          return 1;
        }

        continue;
      }
    },
  };
};
