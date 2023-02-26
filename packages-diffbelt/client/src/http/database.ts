import {
  CreateCollectionOptions,
  Database as IDatabase,
  Collection as ICollection,
  ListCollectionsResult,
  CreateCollectionResult,
} from '@-/diffbelt-types/src/database/types';
import {
  CallApiOptions,
  GetCollectionResponse,
  ListCollectionsResponse,
  VoidParser,
} from './types';
import {IncomingMessage, request} from 'http';
import {Defer} from '@-/util/src/async/defer';
import {readWholeStream} from '@-/util/src/stream/read-whole-stream';
import {assertNonNullish} from '@-/util/src/assert/assert-non-nullish';
import {Collection} from './collection';
import {NoSuchCollectionError} from '@-/diffbelt-types/src/database/errors';

export type DatabaseOptions = {
  url: string;
};

export class Database implements IDatabase {
  private url: string;

  constructor({url}: DatabaseOptions) {
    this.url = url.replace(/\/$/, '');
  }

  createCollection(
    options: CreateCollectionOptions,
  ): Promise<CreateCollectionResult> {
    const {name, generationId} = options;

    const isManual = Boolean(generationId);

    return this.call({
      method: 'POST',
      path: '/collections/',
      body: {
        collectionName: name,
        isManual,
        initialGenerationId: generationId,
      },
      parser: CreateCollectionResult,
    });
  }

  async getCollection(name: string): Promise<ICollection> {
    const result = await this.call({
      method: 'GET',
      path: `/collections/${encodeURIComponent(name)}`,
      params: {
        fields: 'generationId',
      },
      parser: GetCollectionResponse,
    });

    const {isManual, generationId} = result;

    assertNonNullish(generationId);

    return new Collection({call: this.call.bind(this), name, isManual});
  }

  async listCollections(): Promise<ListCollectionsResult> {
    const result = await this.call({
      method: 'GET',
      path: `/collections/`,
      parser: ListCollectionsResponse,
    });

    return {
      collections: result.items.map((collection) => collection.name),
    };
  }

  deleteCollection(name: string): Promise<void> {
    return this.call({
      method: 'DELETE',
      path: `/collections/${encodeURIComponent(name)}`,
      parser: VoidParser,
    });
  }

  private async call<T>(options: CallApiOptions<T>): Promise<T> {
    const {method, path, params, body, parser} = options;

    const paramsStr = (() => {
      if (!params) {
        return '';
      }

      let result = '';

      for (const [key, value] of Object.entries(params)) {
        if (typeof value !== 'string') {
          continue;
        }

        result += `&${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
      }

      return `?${result.slice(1)}`;
    })();

    const defer = new Defer<IncomingMessage>();

    const req = request(
      `${this.url}${path}${paramsStr}`,
      {
        method,
      },
      (res) => {
        defer.resolve(res);
      },
    );

    req.on('error', (error) => {
      defer.reject(error);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();

    const res = await defer.promise;

    const buffer = await readWholeStream(res);

    if (res.statusCode !== 200) {
      const data: unknown = JSON.parse(buffer.toString('utf8'));
      const error =
        // eslint-disable-next-line no-restricted-syntax
        typeof data === 'object' && data && 'error' in data && data.error;

      switch (error) {
        case 'noSuchCollection':
          throw new NoSuchCollectionError();
      }

      console.error(`${method} ${path}`, buffer.toString('utf8'), body);
      throw Object.assign(new Error('status is not 200'));
    }

    const content = buffer.toString('utf8');

    // console.log(`${method} ${path}`, params, body, content);

    const data = JSON.parse(content);
    let result: T;

    try {
      result = parser.parse(data);
    } catch (error) {
      console.error(error, data);
      throw error;
    }

    return result;
  }
}
