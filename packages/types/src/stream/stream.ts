export type ReadOnlyStream<T> = AsyncGenerator<T, void, void>;

export type StreamController<T> = {
  getGenerator: () => ReadOnlyStream<T>;
  push: (item: T) => void;
  replace: (item: T) => void;
  destroyWithError: (error: unknown) => void;
  destroy: () => void;
};
