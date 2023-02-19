import {
  Collection,
  EncodedKey,
  EncodedValue,
} from '@-/diffbelt-types/src/database/types';
import {
  PercentilesData,
  SinglePercentileData,
} from '@-/diffbelt-types/src/transform/percentiles';
import {binarySearch} from '@-/util/src/array/binary-search';
import {assertNonNullable} from '@-/types/src/assert/runtime';
import {basicCompareKey, isGreaterThan, isLessThan} from '../keys/compare';

const AROUND_ITEMS_COUNT = 200;

type PercentilesStatePercentile = SinglePercentileData & {
  // TODO: reverse this array to simplify code
  aroundLeft: EncodedKey[];
  hasMoreOnTheLeft: boolean;
  aroundRight: EncodedKey[];
  hasMoreOnTheRight: boolean;
};

export class PercentilesState {
  private count = 0;
  private percentiles: PercentilesStatePercentile[] | undefined;
  private initialPercentiles: number[];
  private collection: Collection;
  private fromGenerationId: EncodedValue;
  private generationId: string;
  private phantomId: string | undefined;
  private phantomChanges: (() => Promise<void>)[] = [];

  constructor({
    percentiles,
    percentilesData,
    collection,
    fromGenerationId,
    generationId,
  }: {
    percentiles: number[];
    percentilesData: PercentilesData | undefined;
    collection: Collection;
    fromGenerationId: EncodedValue | null;
    generationId: string;
  }) {
    this.initialPercentiles = percentiles;
    this.collection = collection;
    this.fromGenerationId =
      fromGenerationId !== null ? fromGenerationId : {value: ''};
    this.generationId = generationId;

    if (percentilesData) {
      const {count, percentiles} = percentilesData;

      this.count = count;
      this.percentiles = percentiles.map((def): PercentilesStatePercentile => {
        return {
          ...def,
          aroundLeft: [],
          hasMoreOnTheLeft: true,
          aroundRight: [],
          hasMoreOnTheRight: true,
        };
      });
    }
  }

  async fetchAround() {
    if (!this.percentiles) {
      return;
    }

    if (this.phantomId === undefined) {
      const {phantomId} = await this.collection.startPhantom();
      this.phantomId = phantomId;
    }

    // TODO: do it in a parallel, no need to wait for `fetchAround`,
    //       batch changes
    while (this.phantomChanges.length) {
      const fun = this.phantomChanges.shift()!;
      await fun();
    }

    const promises: Promise<void>[] = [];

    this.percentiles.forEach((percentileObj) => {
      const {
        key,
        hasMoreOnTheLeft,
        aroundLeft,
        aroundRight,
        hasMoreOnTheRight,
      } = percentileObj;

      const needToRefetch =
        (hasMoreOnTheLeft && !aroundLeft.length) ||
        (hasMoreOnTheRight && !aroundRight.length);

      if (!needToRefetch) {
        return;
      }

      promises.push(
        (async () => {
          const {foundKey, left, right, hasMoreOnTheLeft, hasMoreOnTheRight} =
            await this.collection.getKeysAround({
              key: key.key,
              keyEncoding: key.encoding,
              requireKeyExistance: true,
              limit: AROUND_ITEMS_COUNT,
              generationId: this.fromGenerationId.value,
              generationIdEncoding: this.fromGenerationId.encoding,
              phantomId: this.phantomId,
            });

          if (!foundKey) {
            throw new Error('PercentilesState:fetchAround key not found');
          }

          percentileObj.aroundLeft = left;
          percentileObj.aroundRight = right;
          percentileObj.hasMoreOnTheLeft = hasMoreOnTheLeft;
          percentileObj.hasMoreOnTheRight = hasMoreOnTheRight;
        })(),
      );
    });

    if (!promises.length) {
      return;
    }

    await Promise.all(promises);
  }

  /** returns `true` if you need to call `fetchAround()` */
  keyAdded(key: EncodedKey): boolean {
    this.phantomChanges.push(async () => {
      assertNonNullable(this.phantomId);
      await this.collection.put({
        key: key.key,
        keyEncoding: key.encoding,
        value: '',
        generationId: this.fromGenerationId.value,
        generationIdEncoding: this.fromGenerationId.encoding,
        phantomId: this.phantomId,
      });
    });

    if (!this.percentiles) {
      this.count = 1;
      this.percentiles = this.initialPercentiles.map((n) => {
        const p = n / 100;

        const percentile: PercentilesStatePercentile = {
          p,
          key,
          index: 0,
          aroundLeft: [],
          hasMoreOnTheLeft: false,
          aroundRight: [],
          hasMoreOnTheRight: false,
        };

        return percentile;
      });

      return false;
    }

    this.count++;

    let needFetch = false;
    let indexDiff = 0;
    let intervalFound = false;

    this.percentiles.forEach((percentile) => {
      const {p, key: percentileKey, aroundLeft, aroundRight} = percentile;

      if (isLessThan(key, percentileKey)) {
        if (!intervalFound) {
          intervalFound = true;
          indexDiff = 1;
        }

        if (aroundLeft.length) {
          if (isGreaterThan(key, aroundLeft[0])) {
            const pos = binarySearch({
              sortedArray: aroundLeft,
              comparator: (item) => basicCompareKey(key, item),
              returnInsertPos: true,
            });
            aroundLeft.splice(pos, 0, key);

            if (aroundLeft.length > AROUND_ITEMS_COUNT) {
              aroundLeft.shift();
              percentile.hasMoreOnTheLeft = true;
            }
          } else {
            if (
              !percentile.hasMoreOnTheLeft &&
              aroundLeft.length < AROUND_ITEMS_COUNT
            ) {
              aroundLeft.unshift(key);
            } else {
              percentile.hasMoreOnTheLeft = true;
            }
          }
        } else {
          aroundLeft.unshift(key);
        }
      } else {
        if (aroundRight.length) {
          if (isLessThan(key, aroundRight[aroundRight.length - 1])) {
            const pos = binarySearch({
              sortedArray: aroundRight,
              comparator: (item) => basicCompareKey(key, item),
              returnInsertPos: true,
            });
            aroundRight.splice(pos, 0, key);

            if (aroundRight.length > AROUND_ITEMS_COUNT) {
              aroundRight.pop();
              percentile.hasMoreOnTheRight = true;
            }
          } else {
            if (
              !percentile.hasMoreOnTheRight &&
              aroundRight.length < AROUND_ITEMS_COUNT
            ) {
              aroundRight.push(key);
            } else {
              percentile.hasMoreOnTheRight = true;
            }
          }
        } else {
          aroundRight.push(key);
        }
      }

      percentile.index += indexDiff;

      const newIndex = Math.max(
        0,
        Math.min(Math.round((this.count - 1) * p), this.count - 1),
      );

      if (newIndex === percentile.index) {
        return;
      }

      if (Math.abs(newIndex - percentile.index) !== 1) {
        throw new Error('PercentilesState:keyAdded index diffs more then by 1');
      }

      const prevIndex = percentile.index;
      percentile.index = newIndex;

      if (newIndex < prevIndex) {
        const newKey = aroundLeft.pop();
        assertNonNullable(newKey, 'PercentilesState:keyAdded aroundLeft');

        percentile.key = newKey;

        aroundRight.unshift(percentileKey);

        if (aroundRight.length > AROUND_ITEMS_COUNT) {
          aroundRight.pop();
          percentile.hasMoreOnTheRight = true;
        }

        if (percentile.hasMoreOnTheLeft && !aroundLeft.length) {
          needFetch = true;
        }
      } else {
        const newKey = aroundRight.shift();
        assertNonNullable(newKey, 'PercentilesState:keyAdded aroundRight');

        percentile.key = newKey;

        aroundLeft.push(percentileKey);

        if (aroundLeft.length > AROUND_ITEMS_COUNT) {
          aroundLeft.shift();
          percentile.hasMoreOnTheLeft = true;
        }

        if (percentile.hasMoreOnTheRight && !aroundRight.length) {
          needFetch = true;
        }
      }
    });

    return needFetch;
  }

  /** returns `true` if you need to call `fetchAround()` */
  keyRemoved(key: EncodedKey): boolean {
    if (!this.percentiles) {
      throw new Error('PercentilesState:keyRemoved but no percentiles');
    }

    this.phantomChanges.push(async () => {
      assertNonNullable(this.phantomId);
      await this.collection.put({
        key: key.key,
        keyEncoding: key.encoding,
        value: null,
        generationId: this.fromGenerationId.value,
        generationIdEncoding: this.fromGenerationId.encoding,
        phantomId: this.phantomId,
      });
    });

    this.count--;

    let needFetch = false;
    let indexDiff = 0;
    let intervalFound = false;

    this.percentiles.forEach((percentile) => {
      const {p, key: percentileKey, aroundLeft, aroundRight} = percentile;

      if (isLessThan(key, percentileKey)) {
        if (!intervalFound) {
          intervalFound = true;
          indexDiff = -1;
        }

        if (aroundLeft.length) {
          if (isGreaterThan(key, aroundLeft[0])) {
            const pos = binarySearch({
              sortedArray: aroundLeft,
              comparator: (item) => basicCompareKey(key, item),
            });

            if (pos < 0) {
              throw new Error(
                'PercentilesState:keyRemoved key not found in around left',
              );
            }

            aroundLeft.splice(pos, 1);
          }
        }
      } else {
        if (aroundRight.length) {
          if (isLessThan(key, aroundRight[aroundRight.length - 1])) {
            const pos = binarySearch({
              sortedArray: aroundRight,
              comparator: (item) => basicCompareKey(key, item),
            });

            if (pos < 0) {
              throw new Error(
                'PercentilesState:keyRemoved key not found in around right',
              );
            }

            aroundRight.splice(pos, 1);
          }
        }
      }

      percentile.index += indexDiff;

      const newIndex = Math.max(
        0,
        Math.min(Math.round(this.count * p), this.count - 1),
      );

      if (newIndex === percentile.index) {
        if (
          (percentile.hasMoreOnTheLeft && !aroundLeft.length) ||
          (percentile.hasMoreOnTheRight && !aroundRight.length)
        ) {
          needFetch = true;
        }

        return;
      }

      if (Math.abs(newIndex - percentile.index) !== 1) {
        throw new Error(
          'PercentilesState:keyRemoved index diffs more then by 1',
        );
      }

      const prevIndex = percentile.index;
      percentile.index = newIndex;

      if (newIndex < prevIndex) {
        const newKey = aroundLeft.pop();
        assertNonNullable(newKey, 'PercentilesState:keyRemoved aroundLeft');

        percentile.key = newKey;

        aroundRight.unshift(percentileKey);

        if (aroundRight.length > AROUND_ITEMS_COUNT) {
          aroundRight.pop();
          percentile.hasMoreOnTheRight = true;
        }
      } else {
        const newKey = aroundRight.shift();
        assertNonNullable(newKey, 'PercentilesState:keyRemoved aroundRight');

        percentile.key = newKey;

        aroundLeft.push(percentileKey);

        if (aroundLeft.length > AROUND_ITEMS_COUNT) {
          aroundLeft.shift();
          percentile.hasMoreOnTheLeft = true;
        }
      }

      if (
        (percentile.hasMoreOnTheLeft && !aroundLeft.length) ||
        (percentile.hasMoreOnTheRight && !aroundRight.length)
      ) {
        needFetch = true;
      }
    });

    return needFetch;
  }

  getPercentilesData(): PercentilesData {
    if (!this.percentiles) {
      return {
        count: 0,
        percentiles: [],
      };
    }

    return {
      count: this.count,
      percentiles: this.percentiles.map(({p, index, key}) => ({p, index, key})),
    };
  }
}
