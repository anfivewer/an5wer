import {CollectionGeneration} from '../generation';
import {MemoryDatabaseStorage} from '../types';

export type CreateMethodOptions = {
  isManual: boolean;
  getGenerationId: () => string;
  getNextGeneration: () => CollectionGeneration | undefined;
  getStorage: () => MemoryDatabaseStorage;
  scheduleNonManualCommit: () => void;
};
