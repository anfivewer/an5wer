import {
  Collection,
  isGenerationProvidedByReader,
} from '@-/diffbelt-types/src/database/types';
import {
  AlphaGenerationIdGenerator,
  ALPHA_INITIAL_GENERATION_ID,
  generateNextId,
} from '../../util/database/generation-id/alpha';
import {createStream} from '@-/util/src/stream/stream';
import {SingletonAsyncTask} from '@-/util/src/async/singleton';
import {sleep} from '@-/util/src/async/sleep';
import {assertNonNullable} from '@-/types/src/assert/runtime';
import {
  CannotPutInManualCollectionError,
  NextGenerationIsNotStartedError,
  NoSuchCursorError,
  NoSuchReaderError,
  OutdatedGenerationError,
} from '@-/diffbelt-types/src/database/errors';
import {CollectionQueryCursor} from './query-cursor';
import {CursorStartKey, MemoryDatabaseStorage} from './types';
import {CollectionDiffCursor} from './diff-cursor';
import {
  createMemoryStorageTraverser,
  MemoryStorageTraverser,
  TraverserInitialItemNotFoundError,
} from './storage';
import {StorageTraverser} from '../../util/database/traverse/storage';
import {
  PersistCollection,
  PersistCollectionItems,
  PersistCollectionReaders,
  PersistDatabasePart,
} from '@-/diffbelt-types/src/database/persist/parts';
import {IdlingStatus} from '@-/util/src/state/idling-status';
import {RwLock} from '@-/util/src/async/rw-lock';

export class MemoryDatabaseCollection implements Collection {
  private name: string;
  private generationId: string;
  private generationIdStream = createStream<string>();
  private _isManual: boolean;
  private plannedNextGenerationId: string | undefined;
  private nextGenerationKeys = new Set<string>();
  private maxItemsInPack: number;
  private queryCursors = new Map<string, CollectionQueryCursor>();
  private diffCursors = new Map<string, CollectionDiffCursor>();
  private cursorIdGenerator = new AlphaGenerationIdGenerator();
  private readers = new Map<
    string,
    {
      readerId: string;
      generationId: string | null;
      collectionName: string | undefined;
    }
  >();
  private getReaderGenerationId: (options: {
    readerId: string;
    collectionName: string;
  }) => string | null;
  private nonManualGenerationCommitSingleton = new SingletonAsyncTask();
  _idling = new IdlingStatus();
  _rwLock = new RwLock();
  private waitForNonManualGenerationCommit: () => Promise<void>;

  // Maybe use real tree? but currently for testing purposes array is good enough too
  private storage: MemoryDatabaseStorage = [];

  constructor({
    name,
    generationId = ALPHA_INITIAL_GENERATION_ID,
    isManual = false,
    maxItemsInPack,
    getReaderGenerationId,
    waitForNonManualGenerationCommit = () => sleep(50),
    _restore,
  }: {
    name: string;
    generationId?: string;
    isManual?: boolean;
    maxItemsInPack: number;
    getReaderGenerationId: (options: {
      readerId: string;
      collectionName: string;
    }) => string | null;
    waitForNonManualGenerationCommit?: () => Promise<void>;
    _restore?: Pick<
      PersistCollection,
      'nextGenerationId' | 'nextGenerationKeys'
    >;
  }) {
    this.name = name;
    this.generationId = generationId;
    this.maxItemsInPack = maxItemsInPack;
    this._isManual = isManual;
    this.getReaderGenerationId = getReaderGenerationId;
    this.waitForNonManualGenerationCommit = waitForNonManualGenerationCommit;

    if (_restore) {
      const {nextGenerationId, nextGenerationKeys} = _restore;
      this.plannedNextGenerationId = nextGenerationId;

      nextGenerationKeys.forEach((key) => {
        this.nextGenerationKeys.add(key);
      });
    } else {
      this.plannedNextGenerationId = isManual
        ? undefined
        : generateNextId(generationId);
    }
  }

  getName() {
    return this.name;
  }

  isManual() {
    return this._isManual;
  }

  getGeneration() {
    return Promise.resolve(this.generationId);
  }
  getGenerationStream() {
    return this.generationIdStream.getGenerator();
  }
  getPlannedGeneration() {
    return Promise.resolve(this.plannedNextGenerationId ?? null);
  }

  get: Collection['get'] = this.wrapFn(
    {},
    ({key, generationId: requiredGenerationId}) => {
      let traverser: StorageTraverser;

      try {
        traverser = createMemoryStorageTraverser({
          storage: this.storage,
          key,
          generationId: requiredGenerationId,
        }).traverser;
      } catch (error) {
        if (error instanceof TraverserInitialItemNotFoundError) {
          return Promise.resolve({
            generationId: requiredGenerationId || this.generationId,
            item: null,
          });
        }

        throw error;
      }

      const {value, generationId} = traverser.getItem();

      return Promise.resolve({
        generationId,
        item: value ? {key, value} : null,
      });
    },
  );
  query: Collection['query'] = this.wrapFn({}, ({generationId} = {}) => {
    const createCursor = (
      prevCursorId: string | undefined,
      startKey: CursorStartKey | undefined,
    ) => {
      const cursor = new CollectionQueryCursor({
        startKey,
        storage: this.storage,
        generationId: generationId || this.generationId,
        maxItemsInPack: this.maxItemsInPack,
        createNextCursor: ({nextStartKey}) => {
          if (prevCursorId) {
            this.queryCursors.delete(prevCursorId);
          }

          const cursorId = this.cursorIdGenerator.generateNextId();

          this.queryCursors.set(cursorId, createCursor(cursorId, nextStartKey));

          return {cursorId};
        },
      });

      return cursor;
    };

    const cursor = createCursor(undefined, undefined);

    return Promise.resolve(cursor.getCurrentPack());
  });

  readQueryCursor: Collection['readQueryCursor'] = this.wrapFn(
    {},
    ({cursorId}) => {
      const cursor = this.queryCursors.get(cursorId);
      if (!cursor) {
        throw new NoSuchCursorError();
      }

      return Promise.resolve(cursor.getCurrentPack());
    },
  );

  private nonManualCommitDisposer: (() => void) | undefined;
  private scheduleNonManualCommit() {
    if (this._isManual) {
      return;
    }
    if (this.nonManualCommitDisposer) {
      return;
    }

    this.nonManualCommitDisposer = this._idling.startTask(this.name);

    this.nonManualGenerationCommitSingleton
      .schedule(
        this.wrapFn({isWriter: true}, async () => {
          await this.waitForNonManualGenerationCommit();

          if (!this.plannedNextGenerationId) {
            throw new Error(
              'impossible: non-manual collections always have planned generation',
            );
          }

          this.generationId = this.plannedNextGenerationId;
          this.plannedNextGenerationId = generateNextId(this.generationId);
          this.nextGenerationKeys.clear();

          this.generationIdStream.replace(this.generationId);

          this.nonManualCommitDisposer?.();
          this.nonManualCommitDisposer = undefined;
        }),
      )
      .catch((error) => {
        // FIXME
        console.error(error);
      });
  }

  put: Collection['put'] = this.wrapFn(
    {isWriter: true},
    ({key, value, ifNotPresent, generationId}) => {
      if (generationId) {
        if (generationId !== this.plannedNextGenerationId) {
          throw new OutdatedGenerationError();
        }
      } else if (this._isManual) {
        throw new CannotPutInManualCollectionError();
      } else if (!this.plannedNextGenerationId) {
        throw new NextGenerationIsNotStartedError();
      }

      const recordGenerationId: string =
        generationId || this.plannedNextGenerationId;
      assertNonNullable(recordGenerationId, 'put');

      if (!this.storage.length) {
        this.nextGenerationKeys.add(key);
        this.scheduleNonManualCommit();
        this.storage.push({key, value, generationId: recordGenerationId});
        return Promise.resolve({generationId: recordGenerationId});
      }

      const {traverser, getIndex} = createMemoryStorageTraverser({
        storage: this.storage,
        key,
        exactKey: false,
        generationId: recordGenerationId,
      });

      const place = traverser.goToInsertPosition({
        key,
        generationId: recordGenerationId,
      });

      if (place === 0) {
        if (ifNotPresent) {
          const {generationId: itemGenerationId} = this.storage[getIndex()];
          return Promise.resolve({generationId: itemGenerationId});
        }

        this.nextGenerationKeys.add(key);
        this.storage[getIndex()].value = value;
      } else {
        const index = getIndex() + (place < 0 ? 0 : 1);

        if (ifNotPresent) {
          const itemGenerationId = (() => {
            // Insert position only can be at item itself or be next to it,
            // so check current index and the previous one
            const checkItemPresent = (index: number): string | undefined => {
              const {key: itemKey, generationId: itemGenerationId} =
                this.storage[index];

              return itemKey === key && itemGenerationId <= recordGenerationId
                ? itemGenerationId
                : undefined;
            };

            return (
              (index < this.storage.length
                ? checkItemPresent(index)
                : undefined) ||
              (index >= 1 ? checkItemPresent(index - 1) : undefined)
            );
          })();

          if (itemGenerationId) {
            return Promise.resolve({generationId: itemGenerationId});
          }
        }

        this.nextGenerationKeys.add(key);
        this.storage.splice(index, 0, {
          key,
          value,
          generationId: recordGenerationId,
        });
      }

      this.scheduleNonManualCommit();

      return Promise.resolve({generationId: recordGenerationId});
    },
  );
  putMany: Collection['putMany'] = this.wrapFn(
    {isWriter: true},
    async ({items, generationId}) => {
      await Promise.all(
        items.map((item) =>
          this.put(generationId ? {...item, generationId} : item),
        ),
      );

      assertNonNullable(this.plannedNextGenerationId, 'putMany');

      return {generationId: this.plannedNextGenerationId};
    },
  );
  diff: Collection['diff'] = this.wrapFn({}, (options) => {
    const {toGenerationId: toGenerationIdRaw} = options;

    const fromGenerationId = (() => {
      if (isGenerationProvidedByReader(options)) {
        const {readerId, readerCollectionName} = options;

        if (!readerCollectionName) {
          const reader = this.readers.get(readerId);
          if (!reader) {
            throw new NoSuchReaderError();
          }

          return reader.generationId;
        } else {
          return this.getReaderGenerationId({
            readerId,
            collectionName: readerCollectionName,
          });
        }
      } else {
        return options.fromGenerationId;
      }
    })();

    const toGenerationId = toGenerationIdRaw || this.generationId;

    if (fromGenerationId === toGenerationId) {
      return Promise.resolve({
        fromGenerationId,
        generationId: toGenerationId,
        items: [],
        cursorId: undefined,
      });
    }

    const createCursor = (
      prevCursorId: string | undefined,
      startKey: CursorStartKey | undefined,
    ) => {
      const cursor = new CollectionDiffCursor({
        startKey,
        storage: this.storage,
        fromGenerationId,
        toGenerationId,
        maxItemsInPack: this.maxItemsInPack,
        createNextCursor: ({nextStartKey}) => {
          if (prevCursorId) {
            this.diffCursors.delete(prevCursorId);
          }

          const cursorId = this.cursorIdGenerator.generateNextId();

          this.diffCursors.set(cursorId, createCursor(cursorId, nextStartKey));

          return {cursorId};
        },
      });

      return cursor;
    };

    const cursor = createCursor(undefined, undefined);

    return Promise.resolve(cursor.getCurrentPack());
  });
  readDiffCursor: Collection['readDiffCursor'] = this.wrapFn(
    {},
    ({cursorId}) => {
      const cursor = this.diffCursors.get(cursorId);
      if (!cursor) {
        throw new NoSuchCursorError();
      }

      return Promise.resolve(cursor.getCurrentPack());
    },
  );

  closeCursor: Collection['closeCursor'] = this.wrapFn({}, ({cursorId}) => {
    this.queryCursors.delete(cursorId);
    this.diffCursors.delete(cursorId);

    return Promise.resolve();
  });

  _getReaderGenerationId(readerId: string): string | null {
    const reader = this.readers.get(readerId);
    if (!reader) {
      throw new NoSuchReaderError();
    }

    return reader.generationId;
  }

  listReaders: Collection['listReaders'] = this.wrapFn({}, () => {
    const readers: Awaited<ReturnType<Collection['listReaders']>> = [];

    this.readers.forEach(({readerId, generationId, collectionName}) => {
      readers.push({readerId, generationId, collectionName});
    });

    return Promise.resolve(readers);
  });
  createReader: Collection['createReader'] = this.wrapFn(
    {isWriter: true},
    ({readerId, generationId, collectionName}) => {
      this.readers.set(readerId, {readerId, generationId, collectionName});
      return Promise.resolve();
    },
  );
  updateReader: Collection['updateReader'] = this.wrapFn(
    {isWriter: true},
    ({readerId, generationId}) => {
      const reader = this.readers.get(readerId);
      if (!reader) {
        throw new NoSuchReaderError();
      }

      reader.generationId = generationId;

      return Promise.resolve();
    },
  );
  deleteReader: Collection['deleteReader'] = this.wrapFn(
    {isWriter: true},
    ({readerId}) => {
      this.readers.delete(readerId);
      return Promise.resolve();
    },
  );

  startTransaction: Collection['startTransaction'] = this.wrapFn({}, () => {
    throw new Error('not implemented yet');
  });
  commitTransaction: Collection['commitTransaction'] = this.wrapFn({}, () => {
    throw new Error('not implemented yet');
  });
  abortTransaction: Collection['abortTransaction'] = this.wrapFn({}, () => {
    throw new Error('not implemented yet');
  });

  startGeneration: Collection['startGeneration'] = this.wrapFn(
    {isWriter: true},
    ({generationId, abortOutdated}) => {
      if (
        this.plannedNextGenerationId &&
        this.plannedNextGenerationId !== generationId
      ) {
        if (abortOutdated && generationId > this.plannedNextGenerationId) {
          return this.abortGeneration({
            generationId: this.plannedNextGenerationId,
          });
        }

        throw new OutdatedGenerationError();
      }

      this.plannedNextGenerationId = generationId;

      return Promise.resolve();
    },
  );
  commitGeneration: Collection['commitGeneration'] = this.wrapFn(
    {isWriter: true},
    ({generationId, updateReaders}) => {
      if (this.plannedNextGenerationId !== generationId) {
        throw new OutdatedGenerationError();
      }
      if (!this._isManual) {
        throw new CannotPutInManualCollectionError();
      }

      updateReaders?.forEach(({readerId}) => {
        if (!this.readers.has(readerId)) {
          throw new NoSuchReaderError();
        }
      });

      this.generationId = generationId;
      this.plannedNextGenerationId = undefined;
      this.nextGenerationKeys.clear();

      updateReaders?.forEach(({readerId, generationId}) => {
        const reader = this.readers.get(readerId);
        if (reader) {
          reader.generationId = generationId;
        }
      });

      this.generationIdStream.replace(generationId);

      return Promise.resolve();
    },
  );
  abortGeneration: Collection['abortGeneration'] = this.wrapFn(
    {isWriter: true},
    async ({generationId}) => {
      if (this.plannedNextGenerationId !== generationId) {
        throw new OutdatedGenerationError();
      }
      if (!this._isManual) {
        throw new CannotPutInManualCollectionError();
      }

      await this._rwLock.blockWrite(() => {
        this.nextGenerationKeys.forEach((key) => {
          let traversing: MemoryStorageTraverser;

          try {
            traversing = createMemoryStorageTraverser({
              storage: this.storage,
              key,
              generationId: this.plannedNextGenerationId,
              exactGenerationId: true,
            });
          } catch (error) {
            if (error instanceof TraverserInitialItemNotFoundError) {
              return;
            }

            throw error;
          }

          this.storage.splice(traversing.getIndex(), 1);
        });

        this.nextGenerationKeys.clear();
        this.plannedNextGenerationId = undefined;
      });
    },
  );

  async _dump({
    pushDumpPart,
    isClosed,
    onNotFull,
  }: {
    pushDumpPart: (part: PersistDatabasePart) => void;
    isClosed: () => boolean;
    onNotFull: () => Promise<void>;
  }): Promise<void> {
    pushDumpPart({
      type: 'collection',
      name: this.name,
      generationId: this.generationId,
      nextGenerationId: this.plannedNextGenerationId,
      nextGenerationKeys: Array.from(this.nextGenerationKeys),
      isManual: this._isManual,
    });

    pushDumpPart({
      type: 'readers',
      collectionName: this.name,
      readers: Array.from(this.readers.values()),
    });

    let processedSize = 0;

    let items: PersistCollectionItems['items'] = [];
    const pushItems = () => {
      if (!items.length) {
        return;
      }

      pushDumpPart({
        type: 'items',
        collectionName: this.name,
        items,
      });

      items = [];
    };

    for (const {key, value, generationId} of this.storage) {
      items.push({key, value, generationId});

      processedSize += key.length + (value?.length ?? 0) + generationId.length;
      if (processedSize >= 256) {
        if (isClosed()) {
          return;
        }

        processedSize = 0;

        pushItems();
        await onNotFull();
      }
    }

    pushItems();
  }

  _restoreItems({items}: PersistCollectionItems): void {
    items.forEach((item) => {
      this.storage.push(item);
    });
  }
  _restoreReaders({readers}: PersistCollectionReaders): void {
    this.readers.clear();

    readers.forEach((reader) => {
      this.readers.set(reader.readerId, {
        ...reader,
        collectionName: reader.collectionName,
      });
    });
  }

  private wrapFn<Args extends unknown[], Result>(
    {isWriter = false}: {isWriter?: boolean},
    fun: (...args: Args) => Result | Promise<Result>,
  ): (...args: Args) => Promise<Result> {
    return async (...args) => {
      const locksDef = {read: true, write: isWriter};
      while (this._rwLock.hasLocks(locksDef)) {
        await this._rwLock.waitLocks(locksDef);
      }

      return this._idling.wrapTask(() => fun(...args));
    };
  }
}
