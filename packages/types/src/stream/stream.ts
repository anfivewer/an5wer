import {createCustomError} from '../errors/util';

export type ReadOnlyStream<T> = AsyncGenerator<T, void, void>;

export type StreamController<T, N = void> = {
  getGenerator: () => AsyncGenerator<T, void, N>;
  push: (item: T) => void;
  replace: (item: T) => void;
  destroyWithError: (error: unknown) => void;
  destroy: () => void;
  finish: () => void;
  isClosed: () => boolean;
  isFull: () => boolean;
  onNotFull: () => Promise<void>;
};

export type FinishableStream<T> = AsyncGenerator<T, void, void | 'finish'>;

export const StreamIsClosedError = createCustomError('StreamIsClosedError');
