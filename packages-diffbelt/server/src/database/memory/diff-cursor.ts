import {
  DiffResult,
  DiffResultItems,
  EncodedValue,
} from '@-/diffbelt-types/src/database/types';
import {goNextGenerationInCurrentKey} from '../../util/database/traverse/generation';
import {
  goNextKey,
  goToFirstRecordInCurrentKey,
} from '../../util/database/traverse/key';
import {searchPhantomInCurrentKey} from '../../util/database/traverse/phantom';
import {CollectionGeneration} from './generation';
import {createMemoryStorageTraverser} from './storage';
import {CursorStartKey, MemoryDatabaseStorage} from './types';

export class CollectionDiffCursor {
  private startKey: CursorStartKey | undefined;
  private storage: MemoryDatabaseStorage;
  private fromGenerationId: string | null;
  private toGenerationId: string;
  private phantomId: string | undefined;
  // TODO: use for optimization, to not read whole collection
  private generationsList: CollectionGeneration[];
  private maxItemsInPack: number;
  private createNextCursor: (options: {nextStartKey: CursorStartKey}) => {
    cursorId: string;
  };

  constructor({
    startKey,
    storage,
    fromGenerationId,
    toGenerationId,
    phantomId,
    generationsList,
    maxItemsInPack,
    createNextCursor,
  }: {
    startKey: CursorStartKey | undefined;
    storage: MemoryDatabaseStorage;
    fromGenerationId: string | null;
    toGenerationId: string;
    phantomId: string | undefined;
    generationsList: CollectionDiffCursor['generationsList'];
    maxItemsInPack: number;
    createNextCursor: (options: {nextStartKey: CursorStartKey}) => {
      cursorId: string;
    };
  }) {
    this.startKey = startKey;
    this.storage = storage;
    this.fromGenerationId = fromGenerationId;
    this.toGenerationId = toGenerationId;
    this.phantomId = phantomId;
    this.generationsList = generationsList;
    this.maxItemsInPack = maxItemsInPack;
    this.createNextCursor = createNextCursor;
  }

  getCurrentPack(): DiffResult {
    if (this.startKey === 'end') {
      return {
        fromGenerationId:
          this.fromGenerationId !== null
            ? {value: this.fromGenerationId}
            : {value: ''},
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
        fromGenerationId:
          this.fromGenerationId !== null
            ? {value: this.fromGenerationId}
            : {value: ''},
        generationId: this.toGenerationId,
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

    const items: DiffResultItems = [];

    let finishedByLimit = false;
    let finishedByEnd = false;

    outer: while (true) {
      const found = (() => {
        if (this.fromGenerationId === null) {
          goToFirstRecordInCurrentKey({api});
          return true;
        }

        return searchPhantomInCurrentKey({
          api,
          generationId: this.fromGenerationId,
          phantomId: this.phantomId,
        });
      })();

      const {key, value, generationId, phantomId} = api.getItem();

      if (generationId > this.toGenerationId) {
        const found = goNextKey({api});
        if (!found) {
          finishedByEnd = true;
          break;
        }

        continue;
      }

      const values: (EncodedValue | null)[] = [];
      const pushValue = (value: string | null) => {
        if (!values.length) {
          values.push(value !== null ? {value} : null);
          return;
        }

        const lastValue = values[values.length - 1];

        if (value === null && lastValue === null) {
          return;
        }

        if (value === null || lastValue === null) {
          values.push(value !== null ? {value} : null);
          return;
        }

        if (value !== lastValue.value) {
          values.push(value !== null ? {value} : null);
        }
      };
      const pushItem = () => {
        if (values.length >= 2) {
          items.push({
            key,
            fromValue: values[0],
            toValue: values[values.length - 1],
            intermediateValues: values.slice(1, -1),
          });
        }
      };

      if (!found || this.fromGenerationId === null) {
        pushValue(null);
      }

      if (phantomId === this.phantomId) {
        pushValue(value);
      }

      if (!api.peekNext()) {
        finishedByEnd = true;
        pushItem();
        break;
      }

      while (true) {
        const nextGen = goNextGenerationInCurrentKey({api});
        if (!nextGen.found) {
          if (nextGen.isEnd) {
            finishedByEnd = true;
            pushItem();
            break outer;
          }

          const found = goNextKey({api});
          if (!found) {
            finishedByEnd = true;
            pushItem();
            break outer;
          }
          break;
        }

        if (nextGen.item.generationId > this.toGenerationId) {
          const found = goNextKey({api});
          if (!found) {
            finishedByEnd = true;
            pushItem();
            break outer;
          }
          break;
        }

        if (nextGen.item.phantomId === this.phantomId) {
          pushValue(nextGen.item.value);
        }
      }

      pushItem();

      finishedByLimit = items.length >= this.maxItemsInPack;

      if (finishedByLimit) {
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
      fromGenerationId:
        this.fromGenerationId !== null
          ? {value: this.fromGenerationId}
          : {value: ''},
      generationId: this.toGenerationId,
      items,
      cursorId,
    };
  }
}
