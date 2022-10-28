import {Component} from '@-/types/src/app/component';
import {mkdir} from 'fs/promises';
import {dirname} from 'path';
import {MemoryDatabase, MemoryDatabaseOptions} from './database';
import {dumpMemoryDatabase} from './persist/dump';
import {writeStreamToFile} from '@-/util/src/fs/write-stream-to-file';

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

    // const exists = await isFileExists(dumpPath);

    // if (!exists) {
    //   return;
    // }

    // createReadStream(dumpPath, {encoding: 'utf8'});
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
