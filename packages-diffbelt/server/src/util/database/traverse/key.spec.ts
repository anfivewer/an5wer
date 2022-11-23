import {MemoryStorageTraverserApi} from '../../../database/memory/storage';
import {MemoryDatabaseStorage} from '../../../database/memory/types';
import {goNextKey, goPrevKey} from './key';

describe('goNextKey', () => {
  it('should return false on single item', () => {
    const storage: MemoryDatabaseStorage = [
      {
        key: '5',
        generationId: '2',
        value: '42',
        phantomId: undefined,
      },
    ];
    const api = new MemoryStorageTraverserApi({storage, index: 0});

    const found = goNextKey({api});

    expect(api.getIndex()).toBe(0);
    expect(found).toBe(false);
  });

  it('should return false on last item', () => {
    const storage: MemoryDatabaseStorage = [
      {
        key: '5',
        generationId: '2',
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

    const found = goNextKey({api});

    expect(api.getIndex()).toBe(1);
    expect(found).toBe(false);
  });

  it('should move to next key', () => {
    const storage: MemoryDatabaseStorage = [
      {
        key: '5',
        generationId: '2',
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
    const api = new MemoryStorageTraverserApi({storage, index: 0});

    const found = goNextKey({api});

    expect(api.getIndex()).toBe(1);
    expect(found).toBe(true);
  });

  it('should move to next key skipping generations', () => {
    const storage: MemoryDatabaseStorage = [
      {
        key: '5',
        generationId: '0',
        value: '12',
        phantomId: undefined,
      },
      {
        key: '5',
        generationId: '1',
        value: '13',
        phantomId: undefined,
      },
      {
        key: '5',
        generationId: '2',
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
    const api = new MemoryStorageTraverserApi({storage, index: 0});

    const found = goNextKey({api});

    expect(api.getIndex()).toBe(3);
    expect(found).toBe(true);
  });

  it('should move to next key skipping generations and phantoms', () => {
    const storage: MemoryDatabaseStorage = [
      {
        key: '5',
        generationId: '0',
        value: '12',
        phantomId: undefined,
      },
      {
        key: '5',
        generationId: '1',
        value: '13',
        phantomId: undefined,
      },
      {
        key: '5',
        generationId: '2',
        value: '42',
        phantomId: 'A',
      },
      {
        key: '7',
        generationId: '2',
        value: '42',
        phantomId: undefined,
      },
    ];
    const api = new MemoryStorageTraverserApi({storage, index: 0});

    const found = goNextKey({api});

    expect(api.getIndex()).toBe(3);
    expect(found).toBe(true);
  });

  it('should return false skipping generations and phantoms', () => {
    const storage: MemoryDatabaseStorage = [
      {
        key: '7',
        generationId: '0',
        value: '12',
        phantomId: undefined,
      },
      {
        key: '7',
        generationId: '1',
        value: '13',
        phantomId: 'A',
      },
      {
        key: '7',
        generationId: '2',
        value: '42',
        phantomId: 'B',
      },
    ];
    const api = new MemoryStorageTraverserApi({storage, index: 0});

    const found = goNextKey({api});

    expect(api.getIndex()).toBe(2);
    expect(found).toBe(false);
  });
});

describe('goPrevKey', () => {
  it('should return false on single item', () => {
    const storage: MemoryDatabaseStorage = [
      {
        key: '5',
        generationId: '2',
        value: '42',
        phantomId: undefined,
      },
    ];
    const api = new MemoryStorageTraverserApi({storage, index: 0});

    const found = goPrevKey({api});

    expect(api.getIndex()).toBe(0);
    expect(found).toBe(false);
  });

  it('should return false on first item', () => {
    const storage: MemoryDatabaseStorage = [
      {
        key: '5',
        generationId: '2',
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
    const api = new MemoryStorageTraverserApi({storage, index: 0});

    const found = goPrevKey({api});

    expect(api.getIndex()).toBe(0);
    expect(found).toBe(false);
  });

  it('should move to prev key', () => {
    const storage: MemoryDatabaseStorage = [
      {
        key: '5',
        generationId: '2',
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

    const found = goPrevKey({api});

    expect(api.getIndex()).toBe(0);
    expect(found).toBe(true);
  });

  it('should move to prev key skipping generations', () => {
    const storage: MemoryDatabaseStorage = [
      {
        key: '5',
        generationId: '2',
        value: '42',
        phantomId: undefined,
      },
      {
        key: '7',
        generationId: '0',
        value: '12',
        phantomId: undefined,
      },
      {
        key: '7',
        generationId: '1',
        value: '13',
        phantomId: undefined,
      },
      {
        key: '7',
        generationId: '2',
        value: '42',
        phantomId: undefined,
      },
    ];
    const api = new MemoryStorageTraverserApi({storage, index: 3});

    const found = goPrevKey({api});

    expect(api.getIndex()).toBe(0);
    expect(found).toBe(true);
  });

  it('should move to prev key skipping generations and phantoms', () => {
    const storage: MemoryDatabaseStorage = [
      {
        key: '5',
        generationId: '2',
        value: '42',
        phantomId: undefined,
      },
      {
        key: '7',
        generationId: '0',
        value: '12',
        phantomId: undefined,
      },
      {
        key: '7',
        generationId: '1',
        value: '13',
        phantomId: 'A',
      },
      {
        key: '7',
        generationId: '2',
        value: '42',
        phantomId: 'B',
      },
    ];
    const api = new MemoryStorageTraverserApi({storage, index: 3});

    const found = goPrevKey({api});

    expect(api.getIndex()).toBe(0);
    expect(found).toBe(true);
  });

  it('should return false skipping generations and phantoms', () => {
    const storage: MemoryDatabaseStorage = [
      {
        key: '7',
        generationId: '0',
        value: '12',
        phantomId: undefined,
      },
      {
        key: '7',
        generationId: '1',
        value: '13',
        phantomId: 'A',
      },
      {
        key: '7',
        generationId: '2',
        value: '42',
        phantomId: 'B',
      },
    ];
    const api = new MemoryStorageTraverserApi({storage, index: 2});

    const found = goPrevKey({api});

    expect(api.getIndex()).toBe(0);
    expect(found).toBe(false);
  });
});
