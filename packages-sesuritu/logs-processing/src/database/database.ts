import {MemoryDatabasePersisted} from '@-/diffbelt-server/src/database/memory/database-persisted';
import {BaseComponent, Component} from '@-/types/src/app/component';
import {Context} from '../context/types';
import {NormalizedLogLine} from '../logs/lines-normalizer';
import {
  collections as collectionNamesDef,
  LOG_LINES_COLLECTION_NAME,
} from './structure';
import {AsyncBatcher} from '@-/util/src/async/batch';
import {Collection} from '@-/diffbelt-types/src/database/types';

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
      collectionNamesDef.map(async (name) => {
        if (collectionsSet.has(name)) {
          return;
        }

        await this.db.createCollection(name);
      }),
    );

    this.linesCollection = await this.db.getCollection(
      LOG_LINES_COLLECTION_NAME,
    );
  }

  addLine(line: NormalizedLogLine) {
    this.batcher.batch(line);
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
