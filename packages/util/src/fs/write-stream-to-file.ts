import {ReadOnlyStream} from '@-/types/src/stream/stream';
import {createWriteStream} from 'fs';
import {Defer} from '../async/defer';

export const writeStreamToFile = async ({
  path,
  encoding,
  stream,
}: {
  path: string;
  encoding?: 'utf8';
  stream: ReadOnlyStream<Buffer | string>;
}): Promise<void> => {
  const ws = createWriteStream(path, {encoding, flags: 'w'});
  let onDrainDefer = new Defer();

  let error: unknown;

  ws.on('error', (wsError) => {
    error = wsError;
  });
  ws.on('drain', () => {
    onDrainDefer.resolve();
  });

  for await (const data of stream) {
    if (error) {
      throw error;
    }

    const allowedToContinue = ws.write(data);

    if (!allowedToContinue) {
      if (onDrainDefer.isFulfilled()) {
        onDrainDefer = new Defer();
      }

      await onDrainDefer.promise;
    }
  }
};
