import {MemoryDatabasePersisted} from '@-/diffbelt-server/src/database/memory/database-persisted';
import {BaseComponent, Component} from '@-/types/src/app/component';
import {Context} from '../context/types';
import {NormalizedLogLine} from '../logs/lines-normalizer';
import {
  collections as collectionsDef,
  LOG_LINES_COLLECTION_NAME,
} from './structure';
import {AsyncBatcher} from '@-/util/src/async/batch';
import {
  Database as DiffbeltDatabase,
  Collection,
} from '@-/diffbelt-types/src/database/types';
import {waitForGeneration} from '@-/diffbelt-server/src/util/database/wait-for-generation';
import {initializeDatabaseStructure} from '@-/diffbelt-util/src/database/initialize-structure';

export class Database extends BaseComponent implements Component<Context> {
  private db!: MemoryDatabasePersisted;
  private batcher!: AsyncBatcher<NormalizedLogLine>;
  private linesCollection!: Collection;
  private getNeedToDump!: () => boolean;

  async init({context}: {context: Context}) {
    const {
      config: {databaseDumpPath},
    } = context;

    this.getNeedToDump = () => context.needDumpDatabaseOnStop;

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

    await initializeDatabaseStructure({
      database: this.db,
      collections: collectionsDef,
    });

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
    if (generationId.nextGenerationId === null) {
      return;
    }

    await waitForGeneration({
      collection: this.linesCollection,
      generationId: generationId.nextGenerationId,
    });
  }

  private async handleBatch(lines: NormalizedLogLine[]) {
    await this.linesCollection.putMany({
      items: lines.map((line) => ({key: line, value: '', ifNotPresent: true})),
    });
  }

  async stop() {
    if (!this.getNeedToDump()) {
      return;
    }

    await this.batcher.onIdle();
    await this.db.onIdle();

    await this.db.stop();
  }
}
