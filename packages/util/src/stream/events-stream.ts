import {Defer} from '../async/defer';

type List<T> = {
  value: T;
  next: List<T> | null;
} | null;

export const createEventsStream = <T>(): {
  getGenerator: () => AsyncGenerator<T, void, void>;
  push: (item: T) => void;
  destroyWithError: (error: unknown) => void;
  destroy: () => void;
} => {
  let destroyed = false;
  let error: unknown = null;
  let head: List<T> = null;
  let itemsAvailableDefer = new Defer();

  function getGenerator(): AsyncGenerator<T, void, void> {
    let listItem = head;

    return {
      next: async () => {
        // eslint-disable-next-line no-unmodified-loop-condition
        while (!listItem) {
          itemsAvailableDefer = new Defer();
          await itemsAvailableDefer.promise;

          if (error) {
            throw error;
          }

          if (destroyed) {
            return {value: undefined, done: true};
          }

          listItem = head;
        }

        if (error) {
          throw error;
        }

        if (destroyed) {
          return {value: undefined, done: true};
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
      [Symbol.asyncIterator]: getGenerator,
    };
  }

  const destroy = () => {
    destroyed = true;
    itemsAvailableDefer.resolve();
  };

  return {
    getGenerator,
    push: (item: T): void => {
      const nextHead: List<T> = {value: item, next: null};

      if (head) {
        head.next = nextHead;
      }

      head = nextHead;
      itemsAvailableDefer.resolve();
    },
    destroyWithError: (err: unknown): void => {
      error = err;
      itemsAvailableDefer.resolve();
    },
    destroy,
  };
};