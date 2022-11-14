import {MemoryDatabasePersisted} from '@-/diffbelt-server/src/database/memory/database-persisted';
import {BaseComponent, Component} from '@-/types/src/app/component';
import {Context} from '../context/types';
import {NormalizedLogLine} from '../logs/lines-normalizer';
import {
  collections as collectionNamesDef,
  LOG_LINES_COLLECTION_NAME,
} from './structure';
import {AsyncBatcher} from '@-/util/src/async/batch';
import {
  Database as DiffbeltDatabase,
  Collection,
} from '@-/diffbelt-types/src/database/types';
import {waitForGeneration} from '@-/diffbelt-server/src/util/database/wait-for-generation';

export class Database extends BaseComponent implements Component<Context> {
  private db!: MemoryDatabasePersisted;
  private batcher!: AsyncBatcher<NormalizedLogLine>;
  private linesCollection!: Collection;

  async init({context}: {context: Context}) {
    const {
      config: {databaseDumpPath},
    } = context;

    this.batcher = new AsyncBatcher<NormalizedLogLine>({
      maxItems: 64,
      delayMs: 20,
      handle: this.handleBatch.bind(this),
      handleError: (error) => {
        this.logger.error('batcher', undefined, {error});
      },
    });

    this.db = new MemoryDatabasePersisted({dumpPath: databaseDumpPath});
    await this.db.init();

    const collectionsSet = new Set(
      (await this.db.listCollections()).collections,
    );

    await Promise.all(
      collectionNamesDef.map(
        async ({name, isManual, readers: expectedReaders}) => {
          const createCollection = () =>
            this.db.createCollection(name, {
              generationId: isManual ? '' : undefined,
            });

          if (!collectionsSet.has(name)) {
            await createCollection();
          }

          const collection = await this.db.getCollection(name);

          if (collection.isManual() !== Boolean(isManual)) {
            await this.db.deleteCollection(name);
            await createCollection();
          }

          const actualReaders = await collection.listReaders();
          const actualReadersMap = new Map(
            actualReaders.map((reader) => [reader.readerId, reader]),
          );

          const promises: Promise<void>[] = [];

          // Create/update readers to match the structure
          expectedReaders?.forEach(({name, collectionName}) => {
            const actualReader = actualReadersMap.get(name);
            if (!actualReader) {
              promises.push(
                collection.createReader({
                  readerId: name,
                  generationId: null,
                  collectionName,
                }),
              );
              return;
            }

            const {collectionName: actualCollectionId} = actualReader;
            if (collectionName === actualCollectionId) {
              return;
            }

            promises.push(
              (async () => {
                await collection.deleteReader({readerId: name});
                await collection.createReader({
                  readerId: name,
                  generationId: null,
                  collectionName,
                });
              })(),
            );
          });

          await Promise.all(promises);
        },
      ),
    );

    this.linesCollection = await this.db.getCollection(
      LOG_LINES_COLLECTION_NAME,
    );
  }

  getDiffbelt(): DiffbeltDatabase {
    return this.db;
  }

  addLine(line: NormalizedLogLine) {
    this.batcher.batch(line);
  }

  async onLinesSaved(): Promise<void> {
    const generationId = await this.linesCollection.getPlannedGeneration();
    if (!generationId) {
      return;
    }

    await waitForGeneration({collection: this.linesCollection, generationId});
  }

  private async handleBatch(lines: NormalizedLogLine[]) {
    await this.linesCollection.putMany({
      items: lines.map((line) => ({key: line, value: '', ifNotPresent: true})),
    });
  }

  async stop() {
    await this.batcher.onIdle();
    await this.db.onIdle();

    await this.db.stop();
  }
}
