import {MemoryStorageTraverserApi} from '../../../database/memory/storage';
import {MemoryDatabaseStorage} from '../../../database/memory/types';
import {
  goNextGenerationInCurrentKey,
  searchGenerationInCurrentKey,
} from './generation';
import {createSameKeyRecords} from './__test__/helpers';

describe('goNextGenerationInCurrentKey', () => {
  it('should return false on single record', () => {
    const storage: MemoryDatabaseStorage = [
      {
        key: '5',
        generationId: '2',
        value: '42',
        phantomId: undefined,
      },
    ];
    const api = new MemoryStorageTraverserApi({storage, index: 0});

    const result = goNextGenerationInCurrentKey({
      api,
    });

    expect(api.getIndex()).toBe(0);
    expect(result).toStrictEqual({found: false, isEnd: true});
  });

  it('should return false on end record', () => {
    const storage: MemoryDatabaseStorage = [
      {
        key: '5',
        generationId: '2',
        value: '13',
        phantomId: undefined,
      },
      {
        key: '5',
        generationId: '3',
        value: '42',
        phantomId: undefined,
      },
    ];
    const api = new MemoryStorageTraverserApi({storage, index: 1});

    const result = goNextGenerationInCurrentKey({
      api,
    });

    expect(api.getIndex()).toBe(1);
    expect(result).toStrictEqual({found: false, isEnd: true});
  });

  it('should move to next generation', () => {
    const storage: MemoryDatabaseStorage = [
      {
        key: '5',
        generationId: '2',
        value: '13',
        phantomId: undefined,
      },
      {
        key: '5',
        generationId: '3',
        value: '42',
        phantomId: undefined,
      },
    ];
    const api = new MemoryStorageTraverserApi({storage, index: 0});

    const result = goNextGenerationInCurrentKey({
      api,
    });

    expect(api.getIndex()).toBe(1);
    expect(result).toStrictEqual({found: true, item: storage[1]});
  });

  it('should not move to different key', () => {
    const storage: MemoryDatabaseStorage = [
      {
        key: '5',
        generationId: '2',
        value: '13',
        phantomId: undefined,
      },
      {
        key: '5',
        generationId: '3',
        value: '42',
        phantomId: undefined,
      },
      {
        key: '7',
        generationId: '2',
        value: '42',
        phantomId: undefined,
      },
    ];
    const api = new MemoryStorageTraverserApi({storage, index: 1});

    const result = goNextGenerationInCurrentKey({
      api,
    });

    expect(api.getIndex()).toBe(1);
    expect(result).toStrictEqual({found: false, isEnd: false});
  });
});

describe('searchGenerationInCurrentKey', () => {
  it('should return false on single record', () => {
    const storage: MemoryDatabaseStorage = [
      {
        key: '5',
        generationId: '2',
        value: '42',
        phantomId: undefined,
      },
    ];
    const api = new MemoryStorageTraverserApi({storage, index: 0});

    const result = searchGenerationInCurrentKey({
      api,
      generationId: '1',
    });

    expect(api.getIndex()).toBe(0);
    expect(result).toBe(false);
  });

  it('should search forward', () => {
    const storage: MemoryDatabaseStorage = createSameKeyRecords({
      key: '5',
      generations: ['1', '3', '5', '7'],
    });
    const api = new MemoryStorageTraverserApi({storage, index: 0});

    const result = searchGenerationInCurrentKey({
      api,
      generationId: '6',
    });

    expect(api.getIndex()).toBe(2);
    expect(result).toBe(true);
  });

  it('should search backward', () => {
    const storage: MemoryDatabaseStorage = createSameKeyRecords({
      key: '5',
      generations: ['1', '3', '5', '7'],
    });
    const api = new MemoryStorageTraverserApi({storage, index: 3});

    const result = searchGenerationInCurrentKey({
      api,
      generationId: '2',
    });

    expect(api.getIndex()).toBe(0);
    expect(result).toBe(true);
  });

  it('should stop at different key backward', () => {
    const storage: MemoryDatabaseStorage = createSameKeyRecords({
      key: '5',
      prependKey: '4',
      generations: ['3', '5', '7'],
    });
    const api = new MemoryStorageTraverserApi({storage, index: 2});

    const result = searchGenerationInCurrentKey({
      api,
      generationId: '2',
    });

    expect(api.getIndex()).toBe(1);
    expect(result).toBe(false);
  });
});
