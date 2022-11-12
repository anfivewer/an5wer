import {KeyValue, QueryResult} from '@-/diffbelt-types/src/database/types';
import {createMemoryStorageTraverser} from './storage';
import {CursorStartKey, MemoryDatabaseStorage} from './types';

export class CollectionQueryCursor {
  private startKey: CursorStartKey | undefined;
  private storage: MemoryDatabaseStorage;
  private generationId: string;
  private maxItemsInPack: number;
  private createNextCursor: (options: {nextStartKey: CursorStartKey}) => {
    cursorId: string;
  };

  constructor({
    startKey,
    storage,
    generationId,
    maxItemsInPack,
    createNextCursor,
  }: {
    startKey: CursorStartKey | undefined;
    storage: MemoryDatabaseStorage;
    generationId: string;
    maxItemsInPack: number;
    createNextCursor: (options: {nextStartKey: CursorStartKey}) => {
      cursorId: string;
    };
  }) {
    this.startKey = startKey;
    this.storage = storage;
    this.generationId = generationId;
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

    const traverser = (() => {
      if (!this.startKey) {
        return createMemoryStorageTraverser({
          storage: this.storage,
          initialPos: 0,
        }).traverser;
      }

      const {key, generationId} = this.startKey;

      return createMemoryStorageTraverser({
        storage: this.storage,
        key,
        generationId,
        exactGenerationId: true,
      }).traverser;
    })();

    const items: KeyValue[] = [];

    while (true) {
      const found = traverser.findGenerationRecord({
        generationId: this.generationId,
      });
      if (!found) {
        break;
      }

      const {key, value} = traverser.getItem();
      const hasNextKey = traverser.goNextKey();

      if (value !== null) {
        items.push({key, value});

        if (items.length >= this.maxItemsInPack) {
          break;
        }
      }

      if (!hasNextKey) {
        break;
      }
    }

    const nextStartKey = (() => {
      if (!traverser.peekNext()) {
        return 'end';
      }

      const hasNextKey = traverser.goNextKey();

      if (!hasNextKey) {
        return 'end';
      }

      const {key, generationId} = traverser.getItem();
      return {key, generationId};
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
