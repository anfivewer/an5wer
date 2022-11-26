import {MemoryStorageTraverserApi} from '../../../database/memory/storage';
import {MemoryDatabaseStorage} from '../../../database/memory/types';
import {goToInsertPosition} from './insertion';

describe('goToInsertPosition', () => {
  it('should prepend single item', () => {
    const storage: MemoryDatabaseStorage = [
      {
        key: '5',
        generationId: '2',
        value: '42',
        phantomId: undefined,
      },
    ];
    const api = new MemoryStorageTraverserApi({storage, index: 0});

    const place = goToInsertPosition({
      api,
      key: '3',
      generationId: '3',
      phantomId: undefined,
    });

    expect(api.getIndex()).toBe(0);
    expect(place).toBe(-1);
  });

  it('should append single item', () => {
    const storage: MemoryDatabaseStorage = [
      {
        key: '5',
        generationId: '2',
        value: '42',
        phantomId: undefined,
      },
    ];
    const api = new MemoryStorageTraverserApi({storage, index: 0});

    const place = goToInsertPosition({
      api,
      key: '8',
      generationId: '3',
      phantomId: undefined,
    });

    expect(api.getIndex()).toBe(0);
    expect(place).toBe(1);
  });

  it('should mutate single item', () => {
    const storage: MemoryDatabaseStorage = [
      {
        key: '5',
        generationId: '2',
        value: '42',
        phantomId: undefined,
      },
    ];
    const api = new MemoryStorageTraverserApi({storage, index: 0});

    const place = goToInsertPosition({
      api,
      key: '5',
      generationId: '2',
      phantomId: undefined,
    });

    expect(api.getIndex()).toBe(0);
    expect(place).toBe(0);
  });

  it('bug #1', () => {
    const storage: MemoryDatabaseStorage = [
      {
        key: '00000000003',
        value: '2',
        generationId: '00000000001',
        phantomId: undefined,
      },
      {
        key: '00000000065',
        value: '5',
        generationId: '00000000001',
        phantomId: undefined,
      },
      {
        key: '00000000069',
        value: '11',
        generationId: '00000000001',
        phantomId: undefined,
      },
    ];
    const api = new MemoryStorageTraverserApi({storage, index: 2});

    const place = goToInsertPosition({
      api,
      key: '00000000066',
      generationId: '00000000002',
      phantomId: undefined,
    });

    expect(place).not.toBe(0);

    // If `place === 1`, then index should be 1,
    // if `place === -1`, then index should be 2
    expect(api.getIndex()).toBe(place === 1 ? 1 : 2);
  });

  it('bug #2', () => {
    const storage: MemoryDatabaseStorage = [
      {
        key: '00000000003',
        value: '2',
        generationId: '00000000001',
        phantomId: undefined,
      },
    ];
    const api = new MemoryStorageTraverserApi({storage, index: 0});

    const place = goToInsertPosition({
      api,
      key: '00000000003',
      generationId: '00000000001',
      phantomId: 'A',
    });

    expect(api.getIndex()).toBe(0);
    expect(place).toBe(1);
  });
});
