import {basicCompare} from '@-/util/src/array/basic-sort';
import {binarySearch} from '@-/util/src/array/binary-search';

export class CollectionGeneration {
  private generationId: string;
  private changedKeysList: string[] = [];
  private changedKeysSet = new Set<string>();

  constructor({generationId}: {generationId: string}) {
    this.generationId = generationId;
  }

  getGenerationId() {
    return this.generationId;
  }

  hasChangedKeys() {
    return Boolean(this.changedKeysList.length);
  }

  addKey(key: string) {
    const canAddToEnd =
      !this.changedKeysList.length ||
      this.changedKeysList[this.changedKeysList.length - 1] < key;

    if (canAddToEnd) {
      this.changedKeysSet.add(key);
      this.changedKeysList.push(key);
      return;
    }

    if (this.changedKeysSet.has(key)) {
      return;
    }

    this.changedKeysSet.add(key);

    const pos = binarySearch({
      sortedArray: this.changedKeysList,
      comparator: (x) => basicCompare(key, x),
      returnInsertPos: true,
    });

    this.changedKeysList.splice(pos, 0, key);
  }

  getUnsafeChangedKeys() {
    return this.changedKeysList;
  }
}
