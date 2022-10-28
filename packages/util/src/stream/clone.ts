export const cloneSymbol = Symbol('clone');

export type CloneableStream<T, N> = {
  [cloneSymbol]: () => AsyncGenerator<T, void, N>;
};

export const cloneStream = <T, N>(
  stream: AsyncGenerator<T, void, N>,
): AsyncGenerator<T, void, N> => {
  const cloneableStream = stream as Partial<CloneableStream<T, N>>;
  if (!cloneableStream[cloneSymbol]) {
    throw new Error('stream is not cloneable');
  }

  return cloneableStream[cloneSymbol]();
};
