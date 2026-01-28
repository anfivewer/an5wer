import {
  PersistMetaChunk,
  ChunkId,
  PersistChunk,
  ClientId,
  V1_ROOT_CHUNK,
  asClientId,
  asChunkId,
} from '@-/lazy-planner-types/src/persist';
import {tryJsonParse} from '@-/util/src/json';
import {IPersistChunkLoader} from '../types';
import {
  getLocalStorageProperty,
  ILocalStorageProperty,
} from '@-/util/src/storage/local-storage';
import {deepEquals} from '@-/util/src/object/deep-equals';
import {ChunkIdCollisionError, StorageIsCorruptedError} from '../errors';
import {uuidv7} from 'uuidv7';
import {currentDay} from '../../../../../packages/types/src/date';

export class LocalStorageChunksLoader implements IPersistChunkLoader {
  #prefix: string;
  #metaProperty: ILocalStorageProperty;
  #chunkProperties = new Map<ChunkId, ILocalStorageProperty>();
  clientId: ClientId;

  constructor(options: {prefix: string}) {
    this.#prefix = options.prefix;
    this.#metaProperty = getLocalStorageProperty(`${this.#prefix}:meta`);

    const clientProp = getLocalStorageProperty(`${this.#prefix}:clientId`);
    const clientId = clientProp.get();
    if (typeof clientId === 'string') {
      this.clientId = asClientId(clientId);
    } else {
      this.clientId = asClientId(uuidv7());
      clientProp.set(this.clientId);
    }
  }

  loadMetaChunk(): Promise<PersistMetaChunk> {
    const dataStr = this.#metaProperty.get();

    if (dataStr === null) {
      return Promise.resolve({
        version: 1,
        id: asChunkId(uuidv7()),
        clients: {
          [this.clientId]: {
            id: this.clientId,
            lastActive: currentDay(),
            maxVersion: 1,
            lastChunk: V1_ROOT_CHUNK.metadata.id,
          },
        },
        nextVersionFields: {},
      });
    }

    const data = PersistMetaChunk.safeParse(tryJsonParse(dataStr));
    if (data.success) {
      return Promise.resolve(data.data);
    }

    throw new StorageIsCorruptedError();
  }

  updateMetaChunk(meta: PersistMetaChunk): Promise<void> {
    this.#metaProperty.set(JSON.stringify(meta));
    return Promise.resolve();
  }

  loadChunk(chunkId: ChunkId): Promise<PersistChunk | null> {
    if (chunkId === V1_ROOT_CHUNK.metadata.id) {
      return Promise.resolve(V1_ROOT_CHUNK);
    }

    let prop = this.#chunkProperties.get(chunkId);
    if (!prop) {
      prop = getLocalStorageProperty(`chunk:${chunkId}`);
      this.#chunkProperties.set(chunkId, prop);
    }

    const dataStr = prop.get();
    if (dataStr === null) {
      return Promise.resolve(null);
    }

    const data = PersistChunk.safeParse(tryJsonParse(dataStr));
    if (!data.success) {
      throw new StorageIsCorruptedError();
    }

    return Promise.resolve(data.data);
  }

  uploadChunk(chunk: PersistChunk): Promise<void> {
    const chunkId = chunk.metadata.id;

    if (chunkId === V1_ROOT_CHUNK.metadata.id) {
      throw new ChunkIdCollisionError();
    }

    let prop = this.#chunkProperties.get(chunkId);
    if (!prop) {
      prop = getLocalStorageProperty(`chunk:${chunkId}`);
      this.#chunkProperties.set(chunkId, prop);
    }

    const dataStr = prop.get();
    const isEmptyOrEqual = (() => {
      if (dataStr === null) {
        return true;
      }

      const data = tryJsonParse(dataStr, {});
      return deepEquals(data, chunk);
    })();

    if (!isEmptyOrEqual) {
      throw new ChunkIdCollisionError();
    }

    prop.set(JSON.stringify(chunk));

    return Promise.resolve();
  }
}
