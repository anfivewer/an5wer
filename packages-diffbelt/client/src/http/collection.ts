import {
  AbortGenerationOptions,
  Collection as ICollection,
  CollectionGetKeysAroundOptions,
  CollectionGetKeysAroundResult,
  CommitGenerationOptions,
  CreateReaderOptions,
  DeleteReaderOptions,
  DiffOptions,
  DiffResult,
  GetGenerationIdResult,
  GetNextGenerationIdResult,
  GetOptions,
  GetResult,
  ListReadersResult,
  PutManyOptions,
  PutOptions,
  PutResult,
  QueryOptions,
  QueryResult,
  ReadDiffCursorOptions,
  ReadQueryCursorOptions,
  StartGenerationOptions,
  StartPhantomResult,
  UpdateReaderOptions,
} from '@-/diffbelt-types/src/database/types';
import {
  FinishableStream,
  StreamIsClosedError,
} from '@-/types/src/stream/stream';
import {CallApiFn, VoidParser} from './types';
import {createFinishableStream} from '@-/util/src/stream/finishable-stream';
import {isEqual} from '@-/diffbelt-util/src/keys/compare';
import {assertTypesEqual} from '@-/types/src/assert/is-equal';

export type CollectionOptions = {
  call: CallApiFn;
  name: string;
  isManual: boolean;
};

export class Collection implements ICollection {
  private call: CallApiFn;
  private name: string;
  private _isManual: boolean;

  constructor({call, name, isManual}: CollectionOptions) {
    this.call = call;
    this.name = name;
    this._isManual = isManual;
  }

  getName(): string {
    return this.name;
  }
  isManual(): boolean {
    return this._isManual;
  }

  getGeneration(): Promise<GetGenerationIdResult> {
    return this.call({
      method: 'GET',
      path: `/collections/${encodeURIComponent(this.name)}?fields=generationId`,
      parser: GetGenerationIdResult,
    });
  }
  getGenerationStream(): FinishableStream<GetGenerationIdResult> {
    const stream = createFinishableStream<GetGenerationIdResult>();

    (async () => {
      let prevGenerationId = await this.call({
        method: 'GET',
        path: `/collections/${encodeURIComponent(
          this.name,
        )}/generationId/stream`,
        parser: GetGenerationIdResult,
      });

      stream.push(prevGenerationId);

      while (true) {
        if (stream.isClosed()) {
          return;
        }

        const newGenerationId = await this.call({
          method: 'GET',
          path: `/collections/${encodeURIComponent(
            this.name,
          )}/generationId/stream`,
          parser: GetGenerationIdResult,
        });

        const isSame = isEqual(
          newGenerationId.generationId,
          prevGenerationId.generationId,
        );

        if (isSame) {
          if (stream.isClosed()) {
            return;
          }
          continue;
        }

        prevGenerationId = newGenerationId;

        stream.push(newGenerationId);
      }
    })().catch((error) => {
      if (error instanceof StreamIsClosedError) {
        return;
      }

      stream.destroyWithError(error);
    });

    return stream.getGenerator();
  }
  getPlannedGeneration(): Promise<GetNextGenerationIdResult> {
    return this.call({
      method: 'GET',
      path: `/collections/${encodeURIComponent(
        this.name,
      )}?fields=nextGenerationId`,
      parser: GetNextGenerationIdResult,
    });
  }

  get(options: GetOptions): Promise<GetResult> {
    return this.call({
      method: 'POST',
      path: `/collections/${encodeURIComponent(this.name)}/get`,
      parser: GetResult,
      body: options,
    });
  }
  getKeysAround(
    options: CollectionGetKeysAroundOptions,
  ): Promise<CollectionGetKeysAroundResult> {
    return this.call({
      method: 'POST',
      path: `/collections/${encodeURIComponent(this.name)}/getKeysAround`,
      parser: CollectionGetKeysAroundResult,
      body: options,
    });
  }
  query(options?: QueryOptions): Promise<QueryResult> {
    return this.call({
      method: 'POST',
      path: `/collections/${encodeURIComponent(this.name)}/query/start`,
      parser: QueryResult,
      body: options || {},
    });
  }
  readQueryCursor(options: ReadQueryCursorOptions): Promise<QueryResult> {
    return this.call({
      method: 'POST',
      path: `/collections/${encodeURIComponent(this.name)}/query/next`,
      parser: QueryResult,
      body: options,
    });
  }

  put(options: PutOptions): Promise<PutResult> {
    return this.call({
      method: 'POST',
      path: `/collections/${encodeURIComponent(this.name)}/put`,
      parser: PutResult,
      body: options,
    });
  }
  putMany(options: PutManyOptions): Promise<PutResult> {
    return this.call({
      method: 'POST',
      path: `/collections/${encodeURIComponent(this.name)}/putMany`,
      parser: PutResult,
      body: options,
    });
  }
  diff(options: DiffOptions): Promise<DiffResult> {
    return this.call({
      method: 'POST',
      path: `/collections/${encodeURIComponent(this.name)}/diff/start`,
      parser: DiffResult,
      body: options,
    });
  }
  readDiffCursor(options: ReadDiffCursorOptions): Promise<DiffResult> {
    return this.call({
      method: 'POST',
      path: `/collections/${encodeURIComponent(this.name)}/diff/next`,
      parser: DiffResult,
      body: options,
    });
  }

  closeCursor(): Promise<void> {
    return Promise.resolve();
  }

  listReaders(): Promise<ListReadersResult> {
    return this.call({
      method: 'GET',
      path: `/collections/${encodeURIComponent(this.name)}/readers/`,
      parser: ListReadersResult,
    });
  }
  createReader(options: CreateReaderOptions): Promise<void> {
    return this.call({
      method: 'POST',
      path: `/collections/${encodeURIComponent(this.name)}/readers/`,
      parser: VoidParser,
      body: options,
    });
  }
  updateReader(options: UpdateReaderOptions): Promise<void> {
    const {readerName, ...opts} = options;

    return this.call({
      method: 'PUT',
      path: `/collections/${encodeURIComponent(
        this.name,
      )}/readers/${encodeURIComponent(readerName)}`,
      parser: VoidParser,
      body: opts,
    });
  }
  deleteReader(options: DeleteReaderOptions): Promise<void> {
    const {readerName, ...rest} = options;
    assertTypesEqual<typeof rest, Record<string, never>>(true);

    return this.call({
      method: 'DELETE',
      path: `/collections/${encodeURIComponent(
        this.name,
      )}/readers/${encodeURIComponent(readerName)}`,
      parser: VoidParser,
    });
  }

  startGeneration(options: StartGenerationOptions): Promise<void> {
    return this.call({
      method: 'POST',
      path: `/collections/${encodeURIComponent(this.name)}/generation/start`,
      parser: VoidParser,
      body: options,
    });
  }
  commitGeneration(options: CommitGenerationOptions): Promise<void> {
    return this.call({
      method: 'POST',
      path: `/collections/${encodeURIComponent(this.name)}/generation/commit`,
      parser: VoidParser,
      body: options,
    });
  }
  abortGeneration(options: AbortGenerationOptions): Promise<void> {
    return this.call({
      method: 'POST',
      path: `/collections/${encodeURIComponent(this.name)}/generation/abort`,
      parser: VoidParser,
      body: options,
    });
  }

  startPhantom(): Promise<StartPhantomResult> {
    return this.call({
      method: 'POST',
      path: `/collections/${encodeURIComponent(this.name)}/phantom/start`,
      parser: StartPhantomResult,
      body: {},
    });
  }
  dropPhantom(): Promise<void> {
    return Promise.resolve();
  }
}
