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
  NoSuchCursorError,
  NoSuchReaderError,
  OutdatedGenerationError,
  UnsupportedActionOnNonManualCollectionError,
} from '@-/diffbelt-types/src/database/errors';
import {CollectionQueryCursor} from './query-cursor';
import {CursorStartKey, MemoryDatabaseStorage} from './types';
import {CollectionDiffCursor} from './diff-cursor';
import {
  createMemoryStorageTraverser,
  MemoryStorageTraverser,
  TraverserInitialItemNotFoundError,
} from './storage';
import {
  PersistCollection,
  PersistCollectionGeneration,
  PersistCollectionItems,
  PersistCollectionPhantoms,
  PersistCollectionReaders,
  PersistDatabasePart,
} from '@-/diffbelt-types/src/database/persist/parts';
import {IdlingStatus} from '@-/util/src/state/idling-status';
import {RwLock} from '@-/util/src/async/rw-lock';
import {CollectionGeneration} from './generation';
import {binarySearch} from '@-/util/src/array/binary-search';
import {Phantoms} from './phantoms/phantoms';
import {createGetMethod} from './methods/get';
import {CreateMethodOptions} from './methods/types';
import {createPutMethod} from './methods/put';

export class MemoryDatabaseCollection implements Collection {
  private name: string;
  private generationId: string;
  private generationIdStream = createStream<string>();
  private _isManual: boolean;
  private nextGeneration: CollectionGeneration | undefined;
  private generationsList: CollectionGeneration[] = [];
  private maxItemsInPack: number;
  private queryCursors = new Map<string, CollectionQueryCursor>();
  private diffCursors = new Map<string, CollectionDiffCursor>();
  private cursorIdGenerator = new AlphaGenerationIdGenerator();
  private phantoms = new Phantoms();
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
    _restore?: Pick<PersistCollection, 'nextGenerationId'>;
  }) {
    this.name = name;
    this.generationId = generationId;
    this.maxItemsInPack = maxItemsInPack;
    this._isManual = isManual;
    this.getReaderGenerationId = getReaderGenerationId;
    this.waitForNonManualGenerationCommit = waitForNonManualGenerationCommit;

    if (_restore) {
      const {nextGenerationId} = _restore;

      if (typeof nextGenerationId === 'string') {
        this.nextGeneration = new CollectionGeneration({
          generationId: nextGenerationId,
        });
      }
    }

    if (!isManual && !this.nextGeneration) {
      this.nextGeneration = new CollectionGeneration({
        generationId: generateNextId(generationId),
      });
    }
  }

  getName() {
    return this.name;
  }

  isManual() {
    return this._isManual;
  }

  _getGenerationId() {
    return this.generationId;
  }

  getGeneration() {
    return Promise.resolve(this.generationId);
  }
  getGenerationStream() {
    return this.generationIdStream.getGenerator();
  }
  getPlannedGeneration() {
    if (!this.nextGeneration) {
      return Promise.resolve(null);
    }

    if (this._isManual) {
      return Promise.resolve(this.nextGeneration.getGenerationId());
    }

    if (!this.nextGeneration.hasChangedKeys()) {
      return Promise.resolve(null);
    }

    return Promise.resolve(this.nextGeneration.getGenerationId());
  }

  get: Collection['get'] = this.wrapFn(
    {},
    createGetMethod(this.getCreateMethodOptions()),
  );
  query: Collection['query'] = this.wrapFn(
    {},
    ({generationId, phantomId} = {}) => {
      const createCursor = (
        prevCursorId: string | undefined,
        startKey: CursorStartKey | undefined,
      ) => {
        const cursor = new CollectionQueryCursor({
          startKey,
          storage: this.storage,
          generationId: generationId ?? this.generationId,
          phantomId,
          maxItemsInPack: this.maxItemsInPack,
          createNextCursor: ({nextStartKey}) => {
            if (typeof prevCursorId === 'string') {
              this.queryCursors.delete(prevCursorId);
            }

            const cursorId = this.cursorIdGenerator.generateNextId();

            this.queryCursors.set(
              cursorId,
              createCursor(cursorId, nextStartKey),
            );

            return {cursorId};
          },
        });

        return cursor;
      };

      const cursor = createCursor(undefined, undefined);

      return Promise.resolve(cursor.getCurrentPack());
    },
  );

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

          if (!this.nextGeneration) {
            throw new Error(
              'impossible: non-manual collections always have planned generation',
            );
          }

          const newGeneration = this.nextGeneration;
          const newGenerationId = newGeneration.getGenerationId();

          const nextGeneration = new CollectionGeneration({
            generationId: generateNextId(newGenerationId),
          });

          this.generationId = newGeneration.getGenerationId();
          this.nextGeneration = nextGeneration;
          this.generationsList.push(newGeneration);

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
    createPutMethod(this.getCreateMethodOptions()),
  );

  // FIXME:
  putMany: Collection['putMany'] = this.wrapFn(
    {isWriter: true},
    async ({items, generationId}) => {
      await Promise.all(
        items.map((item) =>
          this.put(
            typeof generationId === 'string' ? {...item, generationId} : item,
          ),
        ),
      );

      assertNonNullable(this.nextGeneration, 'putMany');

      return {generationId: this.nextGeneration.getGenerationId()};
    },
  );

  diff: Collection['diff'] = this.wrapFn({}, (options) => {
    const {toGenerationId: toGenerationIdRaw} = options;

    const fromGenerationId = (() => {
      if (isGenerationProvidedByReader(options)) {
        const {readerId, readerCollectionName} = options;

        if (typeof readerCollectionName !== 'string') {
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

    const toGenerationId = toGenerationIdRaw ?? this.generationId;

    if (fromGenerationId === toGenerationId) {
      return Promise.resolve({
        fromGenerationId,
        generationId: toGenerationId,
        items: [],
        cursorId: undefined,
      });
    }

    const fromPos = (() => {
      if (fromGenerationId === null) {
        return 0;
      }

      const pos = binarySearch({
        sortedArray: this.generationsList,
        comparator: (item) => {
          if (fromGenerationId < item.getGenerationId()) return -1;
          if (fromGenerationId > item.getGenerationId()) return 1;
          return 0;
        },
        returnInsertPos: true,
      });

      if (pos < 0 || pos >= this.generationsList.length) {
        throw new Error('fromGeneration not found');
      }

      if (this.generationsList[pos].getGenerationId() === fromGenerationId) {
        return pos + 1;
      }

      return pos;
    })();

    const toPos = (() => {
      const pos = binarySearch({
        sortedArray: this.generationsList,
        comparator: (item) => {
          if (toGenerationId < item.getGenerationId()) return -1;
          if (toGenerationId > item.getGenerationId()) return 1;
          return 0;
        },
      });

      if (pos < 0) {
        throw new Error('toGeneration not found');
      }

      return pos + 1;
    })();

    const generationsList = this.generationsList.slice(fromPos, toPos);

    const createCursor = (
      prevCursorId: string | undefined,
      startKey: CursorStartKey | undefined,
    ) => {
      const cursor = new CollectionDiffCursor({
        startKey,
        storage: this.storage,
        fromGenerationId,
        toGenerationId,
        phantomId: undefined,
        generationsList,
        maxItemsInPack: this.maxItemsInPack,
        createNextCursor: ({nextStartKey}) => {
          if (typeof prevCursorId === 'string') {
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

  _getReaders() {
    return this.readers;
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

  startGeneration: Collection['startGeneration'] = this.wrapFn(
    {isWriter: true},
    async ({generationId, abortOutdated = false}) => {
      if (!this._isManual) {
        throw new UnsupportedActionOnNonManualCollectionError();
      }

      await (() => {
        const nextGenerationId = this.nextGeneration?.getGenerationId();

        if (
          typeof nextGenerationId === 'string' &&
          nextGenerationId !== generationId
        ) {
          if (abortOutdated && generationId > nextGenerationId) {
            return this.abortGeneration({
              generationId: nextGenerationId,
            });
          }

          throw new OutdatedGenerationError();
        }
      })();

      this.nextGeneration = new CollectionGeneration({
        generationId,
      });

      return Promise.resolve();
    },
  );
  commitGeneration: Collection['commitGeneration'] = this.wrapFn(
    {isWriter: true},
    ({generationId, updateReaders}) => {
      if (
        !this.nextGeneration ||
        this.nextGeneration.getGenerationId() !== generationId
      ) {
        throw new OutdatedGenerationError();
      }
      if (!this._isManual) {
        throw new UnsupportedActionOnNonManualCollectionError();
      }

      updateReaders?.forEach(({readerId}) => {
        if (!this.readers.has(readerId)) {
          throw new NoSuchReaderError();
        }
      });

      const newGeneration = this.nextGeneration;

      this.generationId = newGeneration.getGenerationId();
      this.nextGeneration = undefined;
      this.generationsList.push(newGeneration);

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
      const nextGeneration = this.nextGeneration;

      if (
        !nextGeneration ||
        nextGeneration.getGenerationId() !== generationId
      ) {
        throw new OutdatedGenerationError();
      }
      if (!this._isManual) {
        throw new UnsupportedActionOnNonManualCollectionError();
      }

      await this._rwLock.blockWrite(() => {
        if (nextGeneration !== this.nextGeneration) {
          throw new Error('generation missmatch');
        }

        const changedKeys = nextGeneration.getUnsafeChangedKeys();

        changedKeys.forEach((key) => {
          let traversing: MemoryStorageTraverser;

          try {
            traversing = createMemoryStorageTraverser({
              storage: this.storage,
              key,
              generationId: nextGeneration.getGenerationId(),
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

        this.nextGeneration = undefined;
      });
    },
  );

  startPhantom: Collection['startPhantom'] = this.wrapFn(
    {isWriter: true},
    this.phantoms.startPhantom.bind(this.phantoms),
  );
  dropPhantom: Collection['dropPhantom'] = this.wrapFn(
    {isWriter: true},
    this.phantoms.dropPhantom.bind(this.phantoms),
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
      nextGenerationId: this.nextGeneration?.getGenerationId(),
      isManual: this._isManual,
    });

    const dumpGeneration = ({
      generation,
      type,
    }: {
      generation: CollectionGeneration;
      type: 'generation' | 'nextGeneration';
    }) => {
      const keys = generation.getUnsafeChangedKeys();

      for (let i = 0; i < keys.length; ) {
        const partialKeys: string[] = [];

        for (let j = 0; j < 100; j++) {
          partialKeys.push(keys[i]);

          i++;
          if (i >= keys.length) {
            break;
          }
        }

        if (partialKeys.length) {
          pushDumpPart({
            type,
            collectionName: this.name,
            generationId: generation.getGenerationId(),
            changedKeys: partialKeys,
          });
        }
      }
    };

    if (this.nextGeneration) {
      dumpGeneration({generation: this.nextGeneration, type: 'nextGeneration'});
    }

    for (const generation of this.generationsList) {
      dumpGeneration({generation, type: 'generation'});
    }

    pushDumpPart({
      type: 'readers',
      collectionName: this.name,
      readers: Array.from(this.readers.values()),
    });

    pushDumpPart({
      type: 'phantoms',
      collectionName: this.name,
      lastPhantomId: this.phantoms._getLastPhantomId(),
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

    for (const {key, value, generationId, phantomId} of this.storage) {
      items.push({key, value, generationId, phantomId});

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
    items.forEach(({phantomId, ...item}) => {
      this.storage.push({...item, phantomId});
    });
  }

  _restoreGeneration({
    type,
    generationId,
    changedKeys,
  }: PersistCollectionGeneration): void {
    if (type === 'nextGeneration') {
      const {nextGeneration} = this;
      assertNonNullable(nextGeneration, 'restoreGeneration');
      changedKeys.forEach((key) => {
        nextGeneration.addKey(key);
      });
      return;
    }

    let generation = this.generationsList[this.generationsList.length - 1] as
      | CollectionGeneration
      | undefined;

    if (generation) {
      const genId = generation.getGenerationId();

      if (genId < generationId) {
        generation = new CollectionGeneration({
          generationId,
        });
        this.generationsList.push(generation);
      } else if (genId !== generationId) {
        throw new Error('restoreGeneration: bad order of generations');
      }
    } else {
      generation = new CollectionGeneration({
        generationId,
      });
      this.generationsList.push(generation);
    }

    const existingGeneration: CollectionGeneration = generation;

    changedKeys.forEach((key) => {
      existingGeneration.addKey(key);
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

  _restorePhantoms(phantoms: PersistCollectionPhantoms): void {
    this.phantoms._restore(phantoms);
  }

  _cleanup({oldestGenerationId}: {oldestGenerationId: string | undefined}) {
    // TODO: do not go through whole collection, use keys inside generations
    this.generationsList =
      typeof oldestGenerationId === 'string'
        ? this.generationsList.filter(
            (generation) => generation.getGenerationId() <= oldestGenerationId,
          )
        : [];

    const generationToStay = oldestGenerationId ?? this.generationId;

    this.phantoms.dropAllPhantoms();

    this.storage = this.storage
      // Remove all phantoms
      .filter((item) => item.phantomId === undefined)
      // Take items by pairs
      .filter(({key, generationId, value}, index, storage) => {
        if (index >= storage.length - 1) {
          // Ignore last item, it has no next
          return true;
        }

        const {key: nextItemKey} = storage[index + 1];

        if (generationId < generationToStay && value === null) {
          // If item was removed, we can loose it's tombstone
          return false;
        }

        if (key !== nextItemKey) {
          // key is changed, it means we are at last version of item,
          // no need to delete
          return true;
        }

        // Key not changed, check generation actuality
        return generationId >= generationToStay;
      });

    if (this.storage.length) {
      // Check skipped last item
      const {phantomId, generationId, value} =
        this.storage[this.storage.length - 1];
      if (
        phantomId !== undefined ||
        (generationId < generationToStay && value === null)
      ) {
        this.storage.pop();
      }
    }

    return Promise.resolve();
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

  private createMethodOptions: CreateMethodOptions | undefined;
  private getCreateMethodOptions(): CreateMethodOptions {
    if (this.createMethodOptions) {
      return this.createMethodOptions;
    }

    this.createMethodOptions = {
      isManual: this._isManual,
      getGenerationId: () => this.generationId,
      getNextGeneration: () => this.nextGeneration,
      getStorage: () => this.storage,
      scheduleNonManualCommit: this.scheduleNonManualCommit.bind(this),
    };

    return this.createMethodOptions;
  }
}
