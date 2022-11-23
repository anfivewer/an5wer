import {NoSuchPhantomError} from '@-/diffbelt-types/src/database/errors';
import {PersistCollectionPhantoms} from '@-/diffbelt-types/src/database/persist/parts';
import {Collection} from '@-/diffbelt-types/src/database/types';
import {
  AlphaGenerationIdGenerator,
  ALPHA_INITIAL_GENERATION_ID,
} from '../../../util/database/generation-id/alpha';

export class Phantoms {
  private idGenerator: AlphaGenerationIdGenerator =
    new AlphaGenerationIdGenerator(ALPHA_INITIAL_GENERATION_ID);

  // TODO: store them in the dumps?
  private activePhantoms = new Set<string>();

  _getLastPhantomId() {
    return this.idGenerator.getId();
  }

  _restore({lastPhantomId}: PersistCollectionPhantoms) {
    this.idGenerator = new AlphaGenerationIdGenerator(lastPhantomId);
    this.activePhantoms.clear();
  }

  startPhantom: Collection['startPhantom'] = () => {
    const phantomId = this.idGenerator.generateNextId();
    this.activePhantoms.add(phantomId);

    return Promise.resolve({
      phantomId,
    });
  };

  dropPhantom: Collection['dropPhantom'] = ({phantomId}) => {
    if (!this.activePhantoms.has(phantomId)) {
      throw new NoSuchPhantomError();
    }

    // TODO: remove items
    this.activePhantoms.delete(phantomId);

    return Promise.resolve();
  };

  dropAllPhantoms() {
    this.activePhantoms.clear();
  }
}
