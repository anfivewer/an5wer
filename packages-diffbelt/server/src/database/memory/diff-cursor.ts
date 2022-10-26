import {
  DiffResult,
  DiffResultItems,
  DiffResultValues,
} from '@-/diffbelt-types/src/database/types';
import {createMemoryStorageTraverser} from './storage';
import {CursorStartKey, MemoryDatabaseStorage} from './types';

export class CollectionDiffCursor {
  private startKey: CursorStartKey | undefined;
  private storage: MemoryDatabaseStorage;
  private fromGenerationId: string;
  private toGenerationId: string;
  private maxItemsInPack: number;
  private createNextCursor: (options: {nextStartKey: CursorStartKey}) => {
    cursorId: string;
  };

  constructor({
    startKey,
    storage,
    fromGenerationId,
    toGenerationId,
    maxItemsInPack,
    createNextCursor,
  }: {
    startKey: CursorStartKey | undefined;
    storage: MemoryDatabaseStorage;
    fromGenerationId: string;
    toGenerationId: string;
    maxItemsInPack: number;
    createNextCursor: (options: {nextStartKey: CursorStartKey}) => {
      cursorId: string;
    };
  }) {
    this.startKey = startKey;
    this.storage = storage;
    this.fromGenerationId = fromGenerationId;
    this.toGenerationId = toGenerationId;
    this.maxItemsInPack = maxItemsInPack;
    this.createNextCursor = createNextCursor;
  }

  getCurrentPack(): DiffResult {
    if (this.startKey === 'end') {
      return {
        fromGenerationId: this.fromGenerationId,
        generationId: this.toGenerationId,
        items: [],
        cursorId: undefined,
      };
    }

    if (!this.storage.length) {
      const {cursorId} = this.createNextCursor({
        nextStartKey: 'end',
      });

      return {
        fromGenerationId: this.fromGenerationId,
        generationId: this.toGenerationId,
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

    const items: DiffResultItems = [];

    outer: while (true) {
      const found = traverser.findGenerationRecord({
        generationId: this.fromGenerationId,
      });

      const {key, value, generationId} = traverser.getItem();

      if (generationId > this.toGenerationId) {
        const found = traverser.goNextKey();
        if (!found) {
          break;
        }

        continue;
      }

      const values: DiffResultValues = [];
      const pushValue = (value: string | null) => {
        if (value !== values[values.length - 1]) {
          values.push(value);
        }
      };
      const pushItem = () => {
        if (values.length >= 2) {
          items.push({key, values});
        }
      };

      if (!found) {
        pushValue(null);
      }

      pushValue(value);

      if (!traverser.peekNext()) {
        pushItem();
        break;
      }

      while (true) {
        const item = traverser.goNextGeneration();
        if (!item) {
          break;
        }

        if (item.generationId > this.toGenerationId) {
          const found = traverser.goNextKey();
          if (!found) {
            pushItem();
            break outer;
          }
          break;
        }

        pushValue(item.value);
      }

      pushItem();
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
      fromGenerationId: this.fromGenerationId,
      generationId: this.toGenerationId,
      items,
      cursorId,
    };
  }
}
