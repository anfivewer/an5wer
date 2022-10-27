import {
  StreamController,
  StreamIsClosedError,
} from '@-/types/src/stream/stream';
import {Defer} from '../async/defer';

type List<T> =
  | {
      isEmpty?: false;
      value: T;
      next: List<T>;
    }
  | {isEmpty: true; next: List<T> | null};

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
  let isFinished = false;
  let error: unknown = null;
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
  }): AsyncGenerator<T, void, N> {
    let listItem = initialListItem;
    let currentReplaceId = initialReplaceId;

    return {
      next: async (input: N) => {
        isConsumptionStarted = true;

        if (error) {
          throw error;
        }
        if (isDestroyed) {
          return {value: undefined, done: true};
        }

        handleInput?.(input);

        if (replaceId !== currentReplaceId) {
          currentReplaceId = replaceId;
          listItem = head;
        }

        while (listItem.isEmpty && listItem.next) {
          listItem = listItem.next;
        }

        while (!listItem || listItem.isEmpty) {
          if (isFinished) {
            return {value: undefined, done: true};
          }

          notFullnessDefer.resolve();
          onDataRequested?.();

          if (itemsAvailableDefer.isFulfilled()) {
            itemsAvailableDefer = new Defer();
          }

          await itemsAvailableDefer.promise;

          if (error) {
            throw error;
          }

          if (isDestroyed || isFinished) {
            return {value: undefined, done: true};
          }

          listItem = listItem?.next || head || listItem;
        }

        if (error) {
          throw error;
        }

        if (isDestroyed) {
          return {value: undefined, done: true};
        }

        if (listItem.isEmpty || listItem.next.isEmpty) {
          notFullnessDefer.resolve();
        }

        const item = listItem.value;
        listItem = listItem.next;

        return {value: item, done: false};
      },
      return: () => {
        return Promise.resolve({value: undefined, done: true});
      },
      throw: () => {
        return Promise.resolve({value: undefined, done: true});
      },
      [Symbol.asyncIterator]: () => {
        return getGenerator({listItem, replaceId: currentReplaceId});
      },
    };
  }

  const destroy = () => {
    isDestroyed = true;
    itemsAvailableDefer.resolve();
  };

  return {
    getGenerator: () => getGenerator({listItem: head, replaceId}),
    push: (item: T): void => {
      if (isFinished || isDestroyed || error) {
        throw new StreamIsClosedError(
          `Stream is finished, cannot push, finished: ${isFinished}, destroyed: ${isDestroyed}, error: ${Boolean(
            error,
          )}`,
        );
      }

      const nextTail: List<T> = {
        value: item,
        next: {isEmpty: true, next: null},
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
      if (isFinished || isDestroyed || error) {
        throw new StreamIsClosedError(
          `Stream is finished, cannot replace, finished: ${isFinished}, destroyed: ${isDestroyed}, error: ${Boolean(
            error,
          )}`,
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
      isFinished = true;
      itemsAvailableDefer.resolve();
    },
    isClosed: () => isFinished || isDestroyed || Boolean(error),
    isFull: () => itemsCount >= fullnessItemsCount,
    onNotFull: () => {
      if (error) {
        return Promise.reject(error);
      }

      const isNotFull =
        itemsCount < fullnessItemsCount ||
        !itemsAvailableDefer.isFulfilled() ||
        isFinished ||
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
};
