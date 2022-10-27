import {
  CollectionAlreadyExistsError,
  NoSuchCollectionError,
} from '@-/diffbelt-types/src/database/errors';
import {PersistCollection} from '@-/diffbelt-types/src/database/persist/parts';
import {Database} from '@-/diffbelt-types/src/database/types';
import {MemoryDatabaseCollection} from './collection';
import {IdlingStatus} from '@-/util/src/state/idling-status';
import {RwLock} from '@-/util/src/async/rw-lock';

export class MemoryDatabase implements Database {
  private maxItemsInPack: number;
  private collections = new Map<string, MemoryDatabaseCollection>();
  private collectionDisposers = new Map<string, (() => void)[]>();
  private idling = new IdlingStatus();
  private rwLock = new RwLock();

  constructor({maxItemsInPack = 100}: {maxItemsInPack?: number}) {
    this.maxItemsInPack = maxItemsInPack;
  }

  _getCollections() {
    return this.collections;
  }

  private getReaderGenerationId({
    readerId,
    collectionName,
  }: {
    readerId: string;
    collectionName: string;
  }) {
    const collection = this.collections.get(collectionName);
    if (!collection) {
      throw new NoSuchCollectionError();
    }

    return collection._getReaderGenerationId(readerId);
  }

  private addCollectionDisposer(name: string, disposer: () => void) {
    let disposers = this.collectionDisposers.get(name);
    if (!disposers) {
      disposers = [];
      this.collectionDisposers.set(name, disposers);
    }

    disposers.push(disposer);
  }

  private disposeCollection(name: string) {
    const disposers = this.collectionDisposers.get(name);
    if (!disposers) {
      return;
    }

    this.collectionDisposers.delete(name);

    disposers.forEach((fun) => {
      fun();
    });
  }

  _restoreCollection(collectionDef: PersistCollection) {
    const {name, generationId, nextGenerationId, nextGenerationKeys, isManual} =
      collectionDef;

    const collection = new MemoryDatabaseCollection({
      name,
      generationId,
      isManual,
      maxItemsInPack: this.maxItemsInPack,
      getReaderGenerationId: this.getReaderGenerationId.bind(this),
      _restore: {
        nextGenerationId,
        nextGenerationKeys,
      },
    });

    this.disposeCollection(name);
    this.collections.set(name, collection);

    const dispose = this.idling.dependsOnStream(collection._idling.getStream());
    this.addCollectionDisposer(name, dispose);
  }

  createCollection: Database['createCollection'] = async (
    name,
    {generationId} = {},
  ) => {
    if (this.collections.has(name)) {
      throw new CollectionAlreadyExistsError();
    }

    while (this.rwLock.hasLocks({write: true})) {
      await this.rwLock.waitLocks({write: true});
    }

    const collection = new MemoryDatabaseCollection({
      name,
      generationId,
      isManual: Boolean(generationId),
      maxItemsInPack: this.maxItemsInPack,
      getReaderGenerationId: this.getReaderGenerationId.bind(this),
    });

    this.disposeCollection(name);
    this.collections.set(name, collection);

    const dispose = this.idling.dependsOnStream(collection._idling.getStream());
    this.addCollectionDisposer(name, dispose);
  };

  _getCollection(name: string): MemoryDatabaseCollection | undefined {
    return this.collections.get(name);
  }

  getCollection: Database['getCollection'] = (name) => {
    const collection = this.collections.get(name);
    if (!collection) {
      throw new NoSuchCollectionError();
    }

    return Promise.resolve(collection);
  };

  listCollections: Database['listCollections'] = () => {
    const names: string[] = [];

    this.collections.forEach((_value, name) => {
      names.push(name);
    });

    return Promise.resolve({collections: names});
  };

  deleteCollection: Database['deleteCollection'] = async (name) => {
    while (this.rwLock.hasLocks({write: true})) {
      await this.rwLock.waitLocks({write: true});
    }

    this.disposeCollection(name);
    this.collections.delete(name);
  };

  onIdle() {
    return this.idling.onIdle();
  }
  getIdlingStream() {
    return this.idling.getStream();
  }

  async runExclusiveTask<T>(fun: () => Promise<T>) {
    while (this.idling.getActiveTasksCount() > 0) {
      await this.idling.onIdle();
    }

    return await this.rwLock.blockReadWrite(async () => {
      const disposers = await Promise.all(
        Array.from(this.collections.values()).map((collection) => {
          return collection._rwLock.createReadWriteBlocker();
        }),
      );

      try {
        while (this.idling.getActiveTasksCount() > 0) {
          await this.idling.onIdle();
        }

        const dispose = this.idling.startTask();

        try {
          return await fun();
        } finally {
          dispose();
        }
      } finally {
        disposers.forEach((dispose) => {
          dispose();
        });
      }
    });
  }
}
