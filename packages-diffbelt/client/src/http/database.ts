import {
  CreateCollectionOptions,
  CreateCollectionResult,
  Database as IDatabase,
  Collection as ICollection,
  ListCollectionsResult,
} from '@-/diffbelt-types/src/database/types';

export type DatabaseOptions = {
  url: string;
};

export class Database implements IDatabase {
  private url: string;

  constructor({url}: DatabaseOptions) {
    this.url = url;
  }

  createCollection(
    options: CreateCollectionOptions,
  ): Promise<CreateCollectionResult> {
    throw new Error();
  }

  getCollection(name: string): Promise<ICollection> {
    throw new Error();
  }

  listCollections(): Promise<ListCollectionsResult> {
    throw new Error();
  }

  async deleteCollection(name: string): Promise<void> {
    //
  }
}
