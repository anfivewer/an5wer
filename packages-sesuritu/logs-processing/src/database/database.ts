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
  EncodedKey,
} from '@-/diffbelt-types/src/database/types';
import {waitForGeneration} from '@-/diffbelt-util/src/collection/wait-for-generation';
import {initializeDatabaseStructure} from '@-/diffbelt-util/src/database/initialize-structure';
import {isGreaterThan} from '@-/diffbelt-util/src/keys/compare';

export class Database extends BaseComponent implements Component<Context> {
  private db!: DatabaseClient;
  private batcher!: AsyncBatcher<NormalizedLogLine>;
  private linesCollection!: Collection;
  private getNeedToDump!: () => boolean;
  private lastLinesPutGenerationId: EncodedKey | undefined;

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
      generationId: this.lastLinesPutGenerationId.key,
      generationIdEncoding: this.lastLinesPutGenerationId.encoding,
    });
  }

  private async handleBatch(lines: NormalizedLogLine[]) {
    const {generationId, generationIdEncoding} =
      await this.linesCollection.putMany({
        items: lines.map((line) => ({
          key: line,
          value: '',
          ifNotPresent: true,
        })),
      });

    const key: EncodedKey = {key: generationId, encoding: generationIdEncoding};

    if (!this.lastLinesPutGenerationId) {
      this.lastLinesPutGenerationId = key;
    } else if (isGreaterThan(key, this.lastLinesPutGenerationId)) {
      this.lastLinesPutGenerationId = key;
    }
  }

  async stop() {
    if (!this.getNeedToDump()) {
      return;
    }

    await this.batcher.onIdle();
  }
}
