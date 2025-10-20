import {ChunkId, ClientId, Day} from './types';

export const asClientId = (id: string): ClientId => id as ClientId;
export const asChunkId = (id: string): ChunkId => id as ChunkId;

export const unsafeAsDay = (day: string): Day => day as Day;
