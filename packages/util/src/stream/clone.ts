export const cloneStream = <T, N>(
  stream: AsyncGenerator<T, void, N>,
): AsyncGenerator<T, void, N> => {
  return stream[Symbol.asyncIterator]();
};
