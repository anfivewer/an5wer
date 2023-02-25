import {TestLogger} from '@-/util/src/logging/test-logger';
import {initializeDatabaseStructure} from '@-/diffbelt-util/src/database/initialize-structure';
import {CreateDatabaseFn} from './types';
import {Collection, Database} from '@-/diffbelt-types/src/database/types';
import {dumpCollection} from '@-/diffbelt-util/src/queries/dump';
import {createPercentilesTransform} from '@-/diffbelt-util/src/transform/percentiles';
import {AggregateInterval} from '@-/diffbelt-util/src/transform/types';
import {Logger} from '@-/types/src/logging/logging';
import {number, object} from 'zod';
import {PercentilesData} from '@-/diffbelt-types/src/transform/percentiles';

const TargetItem = object({
  sum: number(),
  percentilesData: PercentilesData,
});

const makeKey = (x: number) => String(x).padStart(10, '0');
const makeValue = (x: number) => String(x).padStart(8, '0');
const makeIntermediateKey = (key: number, value: number) =>
  `${makeKey(key)} ${makeValue(value)}`;
const makeIntermediateItem = (key: number, value: number) => ({
  key: makeIntermediateKey(key, value),
  value: String(value),
});

export const percentilesTest = ({
  createDatabase,
}: {
  createDatabase: CreateDatabaseFn;
}) => {
  describe('percentiles transform', () => {
    let database!: Database;
    let testLogger!: TestLogger;
    let logger!: Logger;
    let initialCollection!: Collection;
    let intermediateCollection!: Collection;
    let targetCollection!: Collection;
    let transform!: () => Promise<void>;

    beforeEach(async () => {
      ({database} = await createDatabase());
      testLogger = new TestLogger();
      logger = testLogger.getLogger();

      await initializeDatabaseStructure({
        database,
        collections: [
          {name: 'percentilesInitial', isManual: true},
          {
            name: 'percentilesIntermediate',
            isManual: true,
            readers: [
              {name: 'fromInitial', collectionName: 'percentilesInitial'},
            ],
          },
          {
            name: 'percentilesTarget',
            isManual: true,
            readers: [
              {
                name: 'fromIntermediate',
                collectionName: 'percentilesIntermediate',
              },
            ],
          },
        ],
      });

      [initialCollection, intermediateCollection, targetCollection] =
        await Promise.all([
          database.getCollection('percentilesInitial'),
          database.getCollection('percentilesIntermediate'),
          database.getCollection('percentilesTarget'),
        ]);

      const innerTransform = createPercentilesTransform({
        interval: AggregateInterval.DAY,
        percentiles: [0, 50, 100],
        extractContext: ({
          database,
          logger,
        }: {
          database: Database;
          logger: Logger;
        }) => ({
          database,
          logger,
        }),
        sourceCollectionName: 'percentilesInitial',
        intermediateCollectionName: 'percentilesIntermediate',
        intermediateToSourceReaderName: 'fromInitial',
        targetCollectionName: 'percentilesTarget',
        targetToIntermediateReaderName: 'fromIntermediate',
        parseSourceItem: (value) => parseInt(value, 10),
        parseIntermediateItem: (value) => parseInt(value, 10),
        serializeIntermediateItem: (item) => String(item),
        parseTargetItem: (value) => TargetItem.parse(JSON.parse(value)),
        serializeTargetItem: (item) => JSON.stringify(item),
        extractPercentilesDataFromTargetItem: (item) => item.percentilesData,
        getIntermediateFromSource: ({key, sourceItem}) => {
          if (sourceItem % 5 !== 0) {
            return null;
          }

          return {
            key: `${key} ${makeValue(sourceItem)}`,
            value: sourceItem,
          };
        },
        getIntermediateTimestampMsFromKey: (key) => {
          return parseInt(key.split(' ', 1)[0], 10) * 1000;
        },
        getTargetKeyFromTimestampMs: (timestampMs) => {
          return String(Math.floor(timestampMs / 1000)).padStart(10, '0');
        },
        getInitialIntermediateAccumulator: ({prevTargetItem}) =>
          prevTargetItem !== null ? prevTargetItem.sum : 0,
        reduceIntermediate: ({accumulator, items}) => {
          let sum = accumulator;

          items.forEach(({prev, next}) => {
            if (prev !== null) {
              sum -= prev;
            }
            if (next !== null) {
              sum += next;
            }
          });

          return sum;
        },
        apply: ({prevTargetItem, reducedItem, percentilesData}) => {
          if (prevTargetItem === null) {
            return {
              sum: reducedItem,
              percentilesData,
            };
          }

          return {
            sum: reducedItem,
            percentilesData,
          };
        },
      });

      transform = () => innerTransform({context: {database, logger}});
    });

    afterEach(() => {
      expect(testLogger.hasErrorsOrWarnings()).toBe(false);
    });

    it('should calculate simple case', async () => {
      await initialCollection.startGeneration({generationId: '01'});

      await initialCollection.putMany({
        items: [
          {key: makeKey(4), value: '12'}, // should be ignored, % 5 !== 0
          {key: makeKey(5), value: '15'},
          {key: makeKey(8), value: '20'},
          {key: makeKey(13), value: '11'}, // ignored
          {key: makeKey(14), value: '5'},
        ],
        generationId: '01',
      });

      await initialCollection.commitGeneration({generationId: '01'});

      await transform();

      {
        const intermediateItems = (await dumpCollection(intermediateCollection))
          .items;

        expect(intermediateItems).toStrictEqual([
          makeIntermediateItem(5, 15),
          makeIntermediateItem(8, 20),
          makeIntermediateItem(14, 5),
        ]);
      }

      {
        const actualItems = (await dumpCollection(targetCollection)).items;

        expect(actualItems).toStrictEqual([
          {
            key: '0000000000',
            value: JSON.stringify({
              sum: 40,
              percentilesData: {
                count: 3,
                percentiles: [
                  {p: 0, index: 0, key: {key: makeIntermediateKey(5, 15)}},
                  {p: 0.5, index: 1, key: {key: makeIntermediateKey(8, 20)}},
                  {p: 1, index: 2, key: {key: makeIntermediateKey(14, 5)}},
                ],
              },
            }),
          },
        ]);
      }

      await initialCollection.startGeneration({generationId: '02'});

      await initialCollection.putMany({
        items: [
          {key: makeKey(4), value: '14'}, // still ignored
          {key: makeKey(5), value: '10'},
          {key: makeKey(7), value: '35'},
          {key: makeKey(9), value: '45'},
        ],
        generationId: '02',
      });

      await initialCollection.commitGeneration({generationId: '02'});

      await transform();

      {
        const intermediateItems = (await dumpCollection(intermediateCollection))
          .items;

        expect(intermediateItems).toStrictEqual([
          makeIntermediateItem(5, 10),
          makeIntermediateItem(7, 35),
          makeIntermediateItem(8, 20),
          makeIntermediateItem(9, 45),
          makeIntermediateItem(14, 5),
        ]);
      }

      {
        const actualItems = (await dumpCollection(targetCollection)).items;

        expect(actualItems).toStrictEqual([
          {
            key: '0000000000',
            value: JSON.stringify({
              sum: 115,
              percentilesData: {
                count: 5,
                percentiles: [
                  {p: 0, index: 0, key: {key: makeIntermediateKey(5, 10)}},
                  {p: 0.5, index: 2, key: {key: makeIntermediateKey(8, 20)}},
                  {p: 1, index: 4, key: {key: makeIntermediateKey(14, 5)}},
                ],
              },
            }),
          },
        ]);
      }
    });
  });
};
