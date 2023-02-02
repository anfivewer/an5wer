import {KeyValue, QueryResult} from '@-/diffbelt-types/src/database/types';
import {goNextKey} from '../../util/database/traverse/key';
import {searchPhantomInCurrentKey} from '../../util/database/traverse/phantom';
import {createMemoryStorageTraverser} from './storage';
import {CursorStartKey, MemoryDatabaseStorage} from './types';

export class CollectionQueryCursor {
  private startKey: CursorStartKey | undefined;
  private storage: MemoryDatabaseStorage;
  private generationId: string;
  private phantomId: string | undefined;
  private maxItemsInPack: number;
  private createNextCursor: (options: {nextStartKey: CursorStartKey}) => {
    cursorId: string;
  };

  constructor({
    startKey,
    storage,
    generationId,
    phantomId,
    maxItemsInPack,
    createNextCursor,
  }: {
    startKey: CursorStartKey | undefined;
    storage: MemoryDatabaseStorage;
    generationId: string;
    phantomId: string | undefined;
    maxItemsInPack: number;
    createNextCursor: (options: {nextStartKey: CursorStartKey}) => {
      cursorId: string;
    };
  }) {
    this.startKey = startKey;
    this.storage = storage;
    this.generationId = generationId;
    this.phantomId = phantomId;
    this.maxItemsInPack = maxItemsInPack;
    this.createNextCursor = createNextCursor;
  }

  getCurrentPack(): QueryResult {
    if (this.startKey === 'end') {
      return {
        generationId: this.generationId,
        items: [],
        cursorId: undefined,
      };
    }

    if (!this.storage.length) {
      const {cursorId} = this.createNextCursor({
        nextStartKey: 'end',
      });

      return {
        generationId: this.generationId,
        items: [],
        cursorId,
      };
    }

    const api = (() => {
      if (!this.startKey) {
        return createMemoryStorageTraverser({
          storage: this.storage,
          initialPos: 0,
        }).api;
      }

      const {key, generationId, phantomId} = this.startKey;

      return createMemoryStorageTraverser({
        storage: this.storage,
        key,
        generationId,
        exactGenerationId: true,
        phantomId,
        exactPhantomId: true,
      }).api;
    })();

    let finishedByLimit = false;
    let finishedByEnd = false;

    const items: KeyValue[] = [];

    while (true) {
      const found = searchPhantomInCurrentKey({
        api,
        generationId: this.generationId,
        phantomId: this.phantomId,
      });
      if (!found) {
        const hasNextKey = goNextKey({api});
        if (!hasNextKey) {
          finishedByEnd = true;
          break;
        }

        continue;
      }

      const {key, value} = api.getItem();
      const hasNextKey = goNextKey({api});

      if (!hasNextKey) {
        finishedByEnd = true;
      }

      if (value !== null) {
        items.push({key, value});

        finishedByLimit = items.length >= this.maxItemsInPack;

        if (finishedByLimit) {
          break;
        }
      }

      if (!hasNextKey) {
        break;
      }
    }

    const nextStartKey = (() => {
      if (finishedByEnd) {
        return 'end';
      }

      if (!finishedByLimit) {
        const hasNextKey = goNextKey({api});

        if (!hasNextKey) {
          return 'end';
        }
      }

      const {key, generationId, phantomId} = api.getItem();
      return {key, keyEncoding: undefined, generationId, phantomId};
    })();

    const {cursorId} = this.createNextCursor({
      nextStartKey,
    });

    return {
      generationId: this.generationId,
      items,
      cursorId,
    };
  }
}
