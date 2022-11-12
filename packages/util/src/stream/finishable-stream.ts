import {StreamController} from '@-/types/src/stream/stream';
import {createStream} from './stream';

export const createFinishableStream = <T>({
  onClosed,
  onDataRequested,
  fullnessItemsCount,
}: {
  onClosed?: () => void;
  onDataRequested?: () => void;
  fullnessItemsCount?: number;
} = {}): StreamController<T, void | 'finish'> => {
  const stream = createStream<T, void | 'finish'>({
    onDataRequested,
    fullnessItemsCount,
    handleInput: (value: void | 'finish') => {
      if (value === 'finish') {
        stream.destroy();
        onClosed?.();
      }
    },
  });

  return stream;
};
