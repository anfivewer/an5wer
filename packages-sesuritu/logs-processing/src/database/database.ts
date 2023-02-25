import {Database as DatabaseClient} from '@-/diffbelt-client/src/http/database';
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
  EncodedValue,
} from '@-/diffbelt-types/src/database/types';
import {waitForGeneration} from '@-/diffbelt-util/src/collection/wait-for-generation';
import {initializeDatabaseStructure} from '@-/diffbelt-util/src/database/initialize-structure';
import {isGreaterThan} from '@-/diffbelt-util/src/keys/compare';

export class Database extends BaseComponent implements Component<Context> {
  private db!: DatabaseClient;
  private batcher!: AsyncBatcher<NormalizedLogLine>;
  private linesCollection!: Collection;
  private getNeedToDump!: () => boolean;
  private lastLinesPutGenerationId: EncodedValue | undefined;

  async init({context}: {context: Context}) {
    this.getNeedToDump = () => context.needDumpDatabaseOnStop;

    this.batcher = new AsyncBatcher<NormalizedLogLine>({
      maxItems: 64,
      delayMs: 20,
      handle: this.handleBatch.bind(this),
      handleError: (error) => {
        this.logger.error('batcher', undefined, {error});
      },
    });

    this.db = new DatabaseClient({url: 'http://127.0.0.1:3030'});

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
    await this.batcher.onIdle();

    if (!this.lastLinesPutGenerationId) {
      return;
    }

    await waitForGeneration({
      collection: this.linesCollection,
      generationId: this.lastLinesPutGenerationId,
    });
  }

  private async handleBatch(lines: NormalizedLogLine[]) {
    const {generationId} = await this.linesCollection.putMany({
      items: lines.map((line) => ({
        key: {value: line},
        value: {value: ''},
        ifNotPresent: true,
      })),
    });

    if (!this.lastLinesPutGenerationId) {
      this.lastLinesPutGenerationId = generationId;
    } else if (isGreaterThan(generationId, this.lastLinesPutGenerationId)) {
      this.lastLinesPutGenerationId = generationId;
    }
  }

  async stop() {
    if (!this.getNeedToDump()) {
      return;
    }

    await this.batcher.onIdle();
  }
}
