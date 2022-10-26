export type MemoryDatabaseStorageKey = {
  key: string;
  generationId: string;
};

export type CursorStartKey = MemoryDatabaseStorageKey | 'end';

export type MemoryDatabaseStorageItem = MemoryDatabaseStorageKey & {
  value: string | null;
};

export type MemoryDatabaseStorage = MemoryDatabaseStorageItem[];
