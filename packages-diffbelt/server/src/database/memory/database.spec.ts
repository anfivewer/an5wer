import {testDatabase} from '../../__tests__/database/database';
import {MemoryDatabase} from './database';

describe('MemoryDatabase', () => {
  it('should pass complex test', async () => {
    const database = new MemoryDatabase({maxItemsInPack: 100});

    await testDatabase({database});
  });
});
