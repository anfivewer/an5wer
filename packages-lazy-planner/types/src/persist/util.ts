import {ChunkId, ClientId} from './types';

export const asClientId = (id: string): ClientId => id as ClientId;
export const asChunkId = (id: string): ChunkId => id as ChunkId;
