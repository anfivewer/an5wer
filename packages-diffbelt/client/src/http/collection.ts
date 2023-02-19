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
import {ReadOnlyStream, StreamIsClosedError} from '@-/types/src/stream/stream';
import {CallApiFn, VoidParser} from './types';
import {createStream} from '@-/util/src/stream/stream';
import {GetKeysAroundRequestBody, GetRequestBody} from '../types/client';

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
      path: `/collections/${this.name}?fields=generationId`,
      parser: GetGenerationIdResult,
    });
  }
  getGenerationStream(): ReadOnlyStream<GetGenerationIdResult> {
    const stream = createStream<GetGenerationIdResult>();

    (async () => {
      let prevGenerationId = await this.call({
        method: 'GET',
        path: `/collections/${this.name}/generationId/stream`,
        parser: GetGenerationIdResult,
      });

      stream.push(prevGenerationId);

      while (true) {
        const newGenerationId = await this.call({
          method: 'GET',
          path: `/collections/${this.name}/generationId/stream`,
          parser: GetGenerationIdResult,
        });

        const isSame =
          newGenerationId.generationId === prevGenerationId.generationId &&
          newGenerationId.generationIdEncoding ===
            prevGenerationId.generationIdEncoding;

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
      path: `/collections/${this.name}?fields=nextGenerationId`,
      parser: GetNextGenerationIdResult,
    });
  }

  get(options: GetOptions): Promise<GetResult> {
    const requestOptions: GetRequestBody = {
      collectionId: this.name,
      ...options,
    };

    return this.call({
      method: 'POST',
      path: '/get',
      parser: GetResult,
      body: requestOptions,
    });
  }
  getKeysAround(
    options: CollectionGetKeysAroundOptions,
  ): Promise<CollectionGetKeysAroundResult> {
    const requestOptions: GetKeysAroundRequestBody = {
      collectionId: this.name,
      ...options,
    };

    return this.call({
      method: 'POST',
      path: '/getKeysAround',
      parser: CollectionGetKeysAroundResult,
      body: requestOptions,
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
      method: 'POST',
      path: `/collections/${encodeURIComponent(this.name)}/reader/list`,
      parser: ListReadersResult,
      body: {},
    });
  }
  createReader(options: CreateReaderOptions): Promise<void> {
    return this.call({
      method: 'POST',
      path: `/collections/${encodeURIComponent(this.name)}/reader/create`,
      parser: VoidParser,
      body: options,
    });
  }
  updateReader(options: UpdateReaderOptions): Promise<void> {
    return this.call({
      method: 'POST',
      path: `/collections/${encodeURIComponent(this.name)}/reader/update`,
      parser: VoidParser,
      body: options,
    });
  }
  deleteReader(options: DeleteReaderOptions): Promise<void> {
    return this.call({
      method: 'POST',
      path: `/collections/${encodeURIComponent(this.name)}/reader/delete`,
      parser: VoidParser,
      body: options,
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
