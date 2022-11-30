export type MemoryDatabaseStorageKey = {
  key: string;
  generationId: string;
  phantomId: string | undefined;
};

export type CursorStartKey = MemoryDatabaseStorageKey | 'end';

export type MemoryDatabaseStorageItem = MemoryDatabaseStorageKey & {
  value: string | null;
  phantomId: string | undefined;
};

export type MemoryDatabaseStorage = MemoryDatabaseStorageItem[];
