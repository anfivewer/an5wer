import {Component} from '@-/types/src/app/component';
import {mkdir} from 'fs/promises';
import {dirname} from 'path';
import {MemoryDatabase, MemoryDatabaseOptions} from './database';
import {dumpMemoryDatabase} from './persist/dump';
import {writeStreamToFile} from '@-/util/src/fs/write-stream-to-file';
import {isFileExists} from '@-/util/src/fs/is-file-exists';
import {createReadStream} from 'fs';
import {readableBuffersToAsyncStream} from '@-/util/src/stream/node-stream-to-async';
import {restoreMemoryDatabase} from './persist/restore';

type MemoryDatabasePersistedOptions = MemoryDatabaseOptions & {
  dumpPath: string;
};

export class MemoryDatabasePersisted
  extends MemoryDatabase
  implements Component<unknown>
{
  private dumpPath: string;

  constructor({dumpPath, ...superOptions}: MemoryDatabasePersistedOptions) {
    super(superOptions);
    this.dumpPath = dumpPath;
  }

  async init() {
    const {dumpPath} = this;

    const dir = dirname(dumpPath);
    await mkdir(dir, {recursive: true});

    const exists = await isFileExists(dumpPath);

    if (!exists) {
      return;
    }

    const dump = readableBuffersToAsyncStream(createReadStream(dumpPath));

    await restoreMemoryDatabase({database: this, dump});
  }

  async stop() {
    const stream = dumpMemoryDatabase({database: this});

    try {
      await writeStreamToFile({path: this.dumpPath, stream});
    } catch (error) {
      stream.next('finish');
      throw error;
    }
  }
}
