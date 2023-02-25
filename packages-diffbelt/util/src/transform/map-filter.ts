import {
  Database,
  EncodedValue,
  KeyValueUpdate,
} from '@-/diffbelt-types/src/database/types';
import {isEqual} from '../keys/compare';
import {diffCollection} from '../queries/diff';

type FilterResult = {key: EncodedValue; value: EncodedValue | null} | null;

export const createMapFilterTransform = <Context, SourceItem>({
  sourceCollectionName,
  targetCollectionName,
  targetCollectionReaderName,
  parseSourceCollectionItem,
  getDatabaseFromContext,
  mapFilter,
}: {
  sourceCollectionName: string;
  targetCollectionName: string;
  targetCollectionReaderName: string;
  parseSourceCollectionItem: (value: EncodedValue) => SourceItem;
  getDatabaseFromContext: (context: Context) => Database;
  mapFilter: (options: {key: EncodedValue; value: SourceItem}) => FilterResult;
}): ((options: {context: Context}) => Promise<void>) => {
  const run = async ({context}: {context: Context}): Promise<boolean> => {
    const db = getDatabaseFromContext(context);

    const [sourceCollection, targetCollection] = await Promise.all([
      db.getCollection(sourceCollectionName),
      db.getCollection(targetCollectionName),
    ]);

    const {stream, fromGenerationId, toGenerationId} = await diffCollection(
      sourceCollection,
      {
        diffOptions: {
          fromReader: {
            readerId: targetCollectionReaderName,
            collectionName: targetCollectionName,
          },
        },
      },
    );

    if (isEqual(fromGenerationId, toGenerationId)) {
      return false;
    }

    await targetCollection.startGeneration({
      generationId: toGenerationId,
      abortOutdated: true,
    });

    for await (const diffs of stream) {
      const updates: KeyValueUpdate[] = [];

      for (const {key, fromValue, toValue} of diffs) {
        if (
          fromValue?.encoding === 'base64' ||
          toValue?.encoding === 'base64'
        ) {
          throw new Error('base64 is not supported yet');
        }

        let prevKey: EncodedValue | undefined;
        let newFiltered: FilterResult = null;

        if (fromValue !== null) {
          const sourceItem = parseSourceCollectionItem(fromValue);
          const filtered = mapFilter({key, value: sourceItem});

          prevKey = filtered?.key;
        }

        if (toValue !== null) {
          const sourceItem = parseSourceCollectionItem(toValue);
          newFiltered = mapFilter({key, value: sourceItem});
        }

        if (!newFiltered) {
          if (prevKey !== undefined) {
            updates.push({key: prevKey, value: null});
          }

          continue;
        }

        if (prevKey !== undefined && newFiltered.key !== prevKey) {
          updates.push({key: prevKey, value: null});
        }

        updates.push({key: newFiltered.key, value: newFiltered.value});
      }

      if (updates.length) {
        await targetCollection.putMany({
          items: updates,
          generationId: toGenerationId,
        });
      }
    }

    await targetCollection.commitGeneration({
      generationId: toGenerationId,
      updateReaders: [
        {
          readerId: targetCollectionReaderName,
          generationId: toGenerationId,
        },
      ],
    });

    return true;
  };

  return async (args: {context: Context}) => {
    while (await run(args)) {
      //
    }
  };
};
