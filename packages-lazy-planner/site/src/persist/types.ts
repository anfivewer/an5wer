import {
  ChunkId,
  PersistChunk,
  PersistMetaChunk,
} from '@-/lazy-planner-types/src/persist';

export interface IPersistChunkLoader {
  loadMetaChunk: () => Promise<PersistMetaChunk>;
  updateMetaChunk: (meta: PersistMetaChunk) => Promise<void>;
  loadChunk: (chunkId: ChunkId) => Promise<PersistChunk | null>;
  uploadChunk: (chunk: PersistChunk) => Promise<void>;
}
