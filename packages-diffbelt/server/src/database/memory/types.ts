import {EncodingType} from '@-/diffbelt-types/src/database/types';

export type MemoryDatabaseStorageKey = {
  key: string;
  keyEncoding: EncodingType | undefined;
  generationId: string;
  phantomId: string | undefined;
};

export type CursorStartKey = MemoryDatabaseStorageKey | 'end';

export type MemoryDatabaseStorageItem = MemoryDatabaseStorageKey & {
  value: string | null;
  valueEncoding: EncodingType | undefined;
  phantomId: string | undefined;
};

export type MemoryDatabaseStorage = MemoryDatabaseStorageItem[];
