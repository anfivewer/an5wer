import {FinishableStream} from '@-/types/src/stream/stream';
import {Readable} from 'stream';
import {createFinishableStream} from './finishable-stream';

export const readableStringsToAsyncStream = (
  readable: Readable,
): FinishableStream<string> => {
  const stream = createFinishableStream<string>({
    fullnessItemsCount: 4,
    onClosed() {
      destroy();
    },
    onDataRequested() {
      readable.resume();
    },
  });

  const destroy = () => {
    readable.pause();
    readable.off('data', onData);
    readable.off('end', onEnd);
    readable.off('close', onEnd);
    readable.off('error', onError);
  };

  const onData = (data: string): void => {
    if (stream.isClosed()) {
      return;
    }

    stream.push(data);

    if (stream.isFull()) {
      readable.pause();
    }
  };

  const onEnd = () => {
    stream.finish();
    destroy();
  };

  const onError = (err: unknown): void => {
    stream.destroyWithError(err);
    destroy();
  };

  readable.on('data', onData);
  readable.on('end', onEnd);
  readable.on('close', onEnd);
  readable.on('error', onError);

  return stream.getGenerator();
};
