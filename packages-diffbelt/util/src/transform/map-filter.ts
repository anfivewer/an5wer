import {Database, KeyValueUpdate} from '@-/diffbelt-types/src/database/types';
import {diffCollection} from '../queries/diff';

type FilterResult = {key: string; value: string | null} | null;

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
  parseSourceCollectionItem: (value: string) => SourceItem;
  getDatabaseFromContext: (context: Context) => Database;
  mapFilter: (options: {key: string; value: SourceItem}) => FilterResult;
}): ((options: {context: Context}) => Promise<void>) => {
  return async ({context}) => {
    const db = getDatabaseFromContext(context);

    const [sourceCollection, targetCollection] = await Promise.all([
      db.getCollection(sourceCollectionName),
      db.getCollection(targetCollectionName),
    ]);

    const {stream, generationId} = await diffCollection(sourceCollection, {
      diffOptions: {
        readerId: targetCollectionReaderName,
        readerCollectionName: targetCollectionName,
      },
    });

    await targetCollection.startGeneration({
      generationId,
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

        const prevValue = fromValue?.value ?? null;
        const lastValue = toValue?.value ?? null;

        let prevKey: string | undefined;
        let newFiltered: FilterResult = null;

        if (prevValue !== null) {
          const sourceItem = parseSourceCollectionItem(prevValue);
          const filtered = mapFilter({key, value: sourceItem});

          prevKey = filtered?.key;
        }

        if (lastValue !== null) {
          const sourceItem = parseSourceCollectionItem(lastValue);
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
        await targetCollection.putMany({items: updates, generationId});
      }
    }

    await targetCollection.commitGeneration({
      generationId,
      updateReaders: [{readerId: targetCollectionReaderName, generationId}],
    });
  };
};
