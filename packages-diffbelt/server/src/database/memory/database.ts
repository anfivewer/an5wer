import {
  CollectionAlreadyExistsError,
  NoSuchCollectionError,
} from '@-/diffbelt-types/src/database/errors';
import {Database} from '@-/diffbelt-types/src/database/types';
import {MemoryDatabaseCollection} from './collection';

export class MemoryDatabase implements Database {
  private maxItemsInPack: number;
  private collections = new Map<string, MemoryDatabaseCollection>();

  constructor({maxItemsInPack = 100}: {maxItemsInPack?: number}) {
    this.maxItemsInPack = maxItemsInPack;
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

  createCollection: Database['createCollection'] = (
    name,
    {generationId} = {},
  ) => {
    if (this.collections.has(name)) {
      throw new CollectionAlreadyExistsError();
    }

    const collection = new MemoryDatabaseCollection({
      name,
      generationId,
      isManual: Boolean(generationId),
      maxItemsInPack: this.maxItemsInPack,
      getReaderGenerationId: this.getReaderGenerationId.bind(this),
    });

    this.collections.set(name, collection);

    return Promise.resolve();
  };

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
}
