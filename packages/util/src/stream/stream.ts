import {
  StreamController,
  StreamIsClosedError,
} from '@-/types/src/stream/stream';
import {Defer} from '../async/defer';
import {CloneableStream, cloneSymbol} from './clone';

type StreamGenerator<T, N> = AsyncGenerator<T, void, N> & CloneableStream<T, N>;

type List<T> =
  | {
      isEmpty?: false;
      isEnd?: false;
      value: T;
      next: List<T> | null;
    }
  | {isEmpty: true; isEnd?: false; next: List<T> | null}
  | {isEnd: true; isEmpty?: false};

export const createStream = <T, N = void>({
  handleInput,
  onDataRequested,
  fullnessItemsCount = 2,
}: {
  handleInput?: (value: N) => void;
  onDataRequested?: () => void;
  fullnessItemsCount?: number;
} = {}): StreamController<T, N> => {
  let isDestroyed = false;
  let error: unknown = null;
  // FIXME: it calculates wrong because of multiple copies of stream
  let itemsCount = 0;
  let head: List<T> = {isEmpty: true, next: null};
  let tail: List<T> = head;
  let isConsumptionStarted = false;
  let replaceId = 0;
  let itemsAvailableDefer = new Defer();
  itemsAvailableDefer.resolve();
  let notFullnessDefer = new Defer();

  function getGenerator({
    listItem: initialListItem,
    replaceId: initialReplaceId,
  }: {
    listItem: List<T>;
    replaceId: number;
  }): StreamGenerator<T, N> {
    let listItem = initialListItem;
    let prevSentListItem: List<T> | null = null;
    let currentReplaceId = initialReplaceId;

    const that: StreamGenerator<T, N> = {
      next: async (input: N) => {
        isConsumptionStarted = true;

        if (error) {
          throw error;
        }
        if (isDestroyed) {
          return {value: undefined, done: true};
        }
        if (listItem.isEnd) {
          return {value: undefined, done: true};
        }

        handleInput?.(input);

        if (replaceId !== currentReplaceId) {
          currentReplaceId = replaceId;
          prevSentListItem = null;
          listItem = head;

          if (listItem.isEnd) {
            return {value: undefined, done: true};
          }
        }

        while (listItem.isEmpty || listItem === prevSentListItem) {
          if (!listItem.next) {
            break;
          }

          listItem = listItem.next;

          if (listItem.isEnd) {
            return {value: undefined, done: true};
          }
        }

        while (listItem.isEmpty || listItem === prevSentListItem) {
          notFullnessDefer.resolve();
          onDataRequested?.();

          if (itemsAvailableDefer.isFulfilled()) {
            itemsAvailableDefer = new Defer();
          }

          await itemsAvailableDefer.promise;

          if (error) {
            throw error;
          }

          if (isDestroyed || listItem.isEnd) {
            return {value: undefined, done: true};
          }

          if (replaceId !== currentReplaceId) {
            currentReplaceId = replaceId;
            listItem = head;
            prevSentListItem = null;
            continue;
          }

          listItem = listItem.next || listItem;

          if (listItem.isEnd) {
            return {value: undefined, done: true};
          }
        }

        if (error) {
          throw error;
        }

        if (isDestroyed) {
          return {value: undefined, done: true};
        }

        if (listItem.isEnd) {
          return {value: undefined, done: true};
        }

        if (listItem.isEmpty || !listItem.next) {
          notFullnessDefer.resolve();
        }

        prevSentListItem = listItem;
        const item = listItem.value;

        if (listItem.next) {
          listItem = listItem.next;
        }

        return {value: item, done: false};
      },
      return: () => {
        return Promise.resolve({value: undefined, done: true});
      },
      throw: () => {
        return Promise.resolve({value: undefined, done: true});
      },
      [Symbol.asyncIterator]: () => {
        return that;
      },
      [cloneSymbol]: () => {
        return getGenerator({listItem, replaceId: currentReplaceId});
      },
    };

    return that;
  }

  const destroy = () => {
    isDestroyed = true;
    itemsAvailableDefer.resolve();
  };

  const streamObj = {
    getGenerator: () => getGenerator({listItem: head, replaceId}),
    push: (item: T): void => {
      if (tail.isEnd || isDestroyed || error) {
        throw new StreamIsClosedError(
          `Stream is finished, cannot push, finished: ${Boolean(
            tail.isEnd,
          )}, destroyed: ${isDestroyed}, error: ${Boolean(error)}`,
        );
      }

      const nextTail: List<T> = {
        value: item,
        next: null,
      };

      tail.next = nextTail;
      tail = nextTail;

      if (isConsumptionStarted) {
        head = nextTail;
        itemsCount = 1;
      } else {
        itemsCount++;
      }

      itemsAvailableDefer.resolve();
    },
    replace: (item: T): void => {
      if (tail.isEnd || isDestroyed || error) {
        throw new StreamIsClosedError(
          `Stream is finished, cannot replace, finished: ${Boolean(
            tail.isEnd,
          )}, destroyed: ${isDestroyed}, error: ${Boolean(error)}`,
        );
      }

      replaceId++;
      itemsCount = 1;
      head = {value: item, next: {isEmpty: true, next: null}};
      tail = head;
      itemsAvailableDefer.resolve();
    },
    destroyWithError: (err: unknown): void => {
      error = err;
      itemsAvailableDefer.resolve();
      notFullnessDefer.reject(err);
    },
    destroy,
    finish: () => {
      if (tail.isEnd) {
        return;
      }

      const nextTail: List<T> = {
        isEnd: true,
      };

      tail.next = nextTail;
      tail = nextTail;

      if (isConsumptionStarted) {
        head = nextTail;
        itemsCount = 1;
      } else {
        itemsCount++;
      }

      itemsAvailableDefer.resolve();
    },
    isClosed: () => Boolean(tail.isEnd || isDestroyed || error),
    isFull: () => itemsCount >= fullnessItemsCount,
    onNotFull: () => {
      if (error) {
        return Promise.reject(error);
      }

      const isNotFull =
        itemsCount < fullnessItemsCount ||
        !itemsAvailableDefer.isFulfilled() ||
        tail.isEnd ||
        isDestroyed;

      if (isNotFull) {
        return Promise.resolve();
      }

      if (notFullnessDefer.isFulfilled()) {
        notFullnessDefer = new Defer();
      }

      return notFullnessDefer.promise;
    },
  };

  return streamObj;
};
