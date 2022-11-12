import {PersistDatabasePart} from '@-/diffbelt-types/src/database/persist/parts';
import {
  FinishableStream,
  StreamIsClosedError,
} from '@-/types/src/stream/stream';
import {createFinishableStream} from '@-/util/src/stream/finishable-stream';
import {MemoryDatabase} from '../database';

export const dumpMemoryDatabase = ({
  database,
}: {
  database: MemoryDatabase;
}): FinishableStream<Buffer> => {
  const stream = createFinishableStream<Buffer>();

  const newLineBuffer = Buffer.from('\n');

  const pushDumpPart = (part: PersistDatabasePart) => {
    stream.push(Buffer.from(JSON.stringify(part), 'utf8'));
    stream.push(newLineBuffer);
  };

  database
    .runExclusiveTask(async () => {
      pushDumpPart({type: 'header', version: 1});

      for (const collection of database._getCollections().values()) {
        if (stream.isClosed()) {
          return;
        }

        // eslint-disable-next-line no-loop-func
        await collection._dump({
          pushDumpPart,
          onNotFull: stream.onNotFull.bind(stream),
          isClosed: stream.isClosed.bind(stream),
        });
      }

      pushDumpPart({type: 'end'});

      stream.finish();
    })
    .catch((error) => {
      if (error instanceof StreamIsClosedError) {
        return;
      }

      stream.destroyWithError(error);
    });

  return stream.getGenerator();
};
