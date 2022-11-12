import {FinishableStream} from '@-/types/src/stream/stream';

export const mapFinishableStreamSync = <A, B>(
  stream: FinishableStream<A>,
  mapper: (value: A) => B,
): FinishableStream<B> => {
  const getGenerator = (): FinishableStream<B> => {
    return {
      next: async (input) => {
        const iteratorResult = await stream.next(input);

        const {value, done} = iteratorResult;
        if (!done) {
          const mappedValue = mapper(value);
          return {value: mappedValue, done: false};
        }

        return {value: undefined, done: true};
      },
      return: () => {
        return Promise.resolve({value: undefined, done: true});
      },
      throw: () => {
        return Promise.resolve({value: undefined, done: true});
      },
      [Symbol.asyncIterator]: () => {
        return getGenerator();
      },
    };
  };

  return getGenerator();
};
