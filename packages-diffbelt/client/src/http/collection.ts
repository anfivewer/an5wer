import {
  AbortGenerationOptions,
  CloseCursorOptions,
  Collection as ICollection,
  CollectionGetKeysAroundOptions,
  CollectionGetKeysAroundResult,
  CommitGenerationOptions,
  CreateReaderOptions,
  DeleteReaderOptions,
  DiffOptions,
  DiffResult,
  DropPhantomOptions,
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
import {CallApiFn} from './types';
import {createStream} from '@-/util/src/stream/stream';
import {
  GetKeysAroundRequestBody,
  GetRequestBody,
  QueryRequestBody,
} from '../types/client';

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
    throw new Error();
  }
  putMany(options: PutManyOptions): Promise<PutResult> {
    throw new Error();
  }
  diff(options: DiffOptions): Promise<DiffResult> {
    throw new Error();
  }
  readDiffCursor(options: ReadDiffCursorOptions): Promise<DiffResult> {
    throw new Error();
  }

  closeCursor(options: CloseCursorOptions): Promise<void> {
    throw new Error();
  }

  listReaders(): Promise<ListReadersResult> {
    throw new Error();
  }
  createReader(options: CreateReaderOptions): Promise<void> {
    throw new Error();
  }
  updateReader(options: UpdateReaderOptions): Promise<void> {
    throw new Error();
  }
  deleteReader(options: DeleteReaderOptions): Promise<void> {
    throw new Error();
  }

  startGeneration(options: StartGenerationOptions): Promise<void> {
    throw new Error();
  }
  commitGeneration(options: CommitGenerationOptions): Promise<void> {
    throw new Error();
  }
  abortGeneration(options: AbortGenerationOptions): Promise<void> {
    throw new Error();
  }

  startPhantom(): Promise<StartPhantomResult> {
    throw new Error();
  }
  dropPhantom(options: DropPhantomOptions): Promise<void> {
    throw new Error();
  }
}
