import {FinishableStream} from '@-/types/src/stream/stream';
import {createLinesStream} from '@-/util/src/stream/lines-stream';
import {MemoryDatabase} from '../database';
import {mapFinishableStreamSync} from '@-/util/src/stream/map';
import {PersistDatabasePart} from '@-/diffbelt-types/src/database/persist/parts';

export const restoreMemoryDatabase = async ({
  database,
  dump,
}: {
  database: MemoryDatabase;
  dump: FinishableStream<Buffer>;
}): Promise<void> => {
  const linesStream = createLinesStream({
    finishableStream: mapFinishableStreamSync(dump, (buffer) =>
      buffer.toString('utf8'),
    ),
  });

  await database.runExclusiveTask(async () => {
    outer: for await (const line of linesStream) {
      const obj: unknown = JSON.parse(line);
      const part = PersistDatabasePart.parse(obj);

      switch (part.type) {
        case 'header': {
          const {version} = part;
          if (version !== 1) {
            throw new Error(`dump is not supported, version: ${version}`);
          }
          break;
        }
        case 'collection':
          database._restoreCollection(part);
          break;
        case 'items': {
          const {collectionName} = part;
          const collection = database._getCollection(collectionName);

          if (!collection) {
            throw new Error(`bad dump, no such collection ${collectionName}`);
          }

          collection._restoreItems(part);
          break;
        }
        case 'generation':
        case 'nextGeneration': {
          const {collectionName} = part;
          const collection = database._getCollection(collectionName);

          if (!collection) {
            throw new Error(`bad dump, no such collection ${collectionName}`);
          }

          collection._restoreGeneration(part);
          break;
        }
        case 'readers': {
          const {collectionName} = part;
          const collection = database._getCollection(collectionName);

          if (!collection) {
            throw new Error(`bad dump, no such collection ${collectionName}`);
          }

          collection._restoreReaders(part);
          break;
        }
        case 'end':
          break outer;
        default: {
          const shouldBeNever: never = part;
          break;
        }
      }
    }
  });
};
