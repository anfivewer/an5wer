import {Database, KeyValueUpdate} from '@-/diffbelt-types/src/database/types';
import {isEqual} from '../keys/compare';
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
  const run = async ({context}: {context: Context}): Promise<boolean> => {
    const db = getDatabaseFromContext(context);

    const [sourceCollection, targetCollection] = await Promise.all([
      db.getCollection(sourceCollectionName),
      db.getCollection(targetCollectionName),
    ]);

    const {stream, fromGenerationId, generationId, generationIdEncoding} =
      await diffCollection(sourceCollection, {
        diffOptions: {
          readerId: targetCollectionReaderName,
          readerCollectionName: targetCollectionName,
        },
      });

    if (
      isEqual(
        {key: fromGenerationId.value, encoding: fromGenerationId.encoding},
        {key: generationId, encoding: generationIdEncoding},
      )
    ) {
      return false;
    }

    await targetCollection.startGeneration({
      generationId,
      generationIdEncoding,
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
        await targetCollection.putMany({
          items: updates,
          generationId,
          generationIdEncoding,
        });
      }
    }

    await targetCollection.commitGeneration({
      generationId,
      generationIdEncoding,
      updateReaders: [
        {
          readerId: targetCollectionReaderName,
          generationId,
          generationIdEncoding,
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
