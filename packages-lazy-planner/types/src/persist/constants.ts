import {PersistChunk} from './types';
import {asChunkId, asClientId} from './util';

export const V1_ROOT_CHUNK: PersistChunk = {
  version: 1,
  metadata: {
    version: 1,
    clientId: asClientId(''),
    id: asChunkId('019a02b8-49bc-7f86-8f11-d075a6a44874'),
    parentIds: [],
  },
  data: {
    version: 1,
    todos: {},
    isArchive: false,
  },
};
