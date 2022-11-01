import {diffCollection} from '@-/diffbelt-server/src/util/database/queries/diff';
import {KeyValueUpdate} from '@-/diffbelt-types/src/database/types';
import {ParsedLogLine} from '@-/types/src/logging/parsed-log';
import {Context} from '../../context/types';
import {PARSED_LINES_COLLECTION_NAME} from '../../database/structure';

type FilterResult = {key: string; value: string | null} | null;

export const createParsedLinesFilterTransform = ({
  targetCollectionName,
  parsedLinesReaderName,
  mapFilter,
}: {
  targetCollectionName: string;
  parsedLinesReaderName: string;
  mapFilter: (options: {key: string; line: ParsedLogLine}) => FilterResult;
}): ((options: {context: Context}) => Promise<void>) => {
  return async ({context}) => {
    const {database} = context;
    const db = database.getDiffbelt();

    const [targetCollection, parsedLinesCollection] = await Promise.all([
      db.getCollection(targetCollectionName),
      db.getCollection(PARSED_LINES_COLLECTION_NAME),
    ]);

    const {stream, generationId} = await diffCollection(parsedLinesCollection, {
      diffOptions: {
        readerId: parsedLinesReaderName,
        readerCollectionName: targetCollectionName,
      },
    });

    await targetCollection.startGeneration({
      generationId,
      abortOutdated: true,
    });

    for await (const diffs of stream) {
      const updates: KeyValueUpdate[] = [];

      for (const {key, values} of diffs) {
        const prevValue = values[0];
        const lastValue = values[values.length - 1];

        let prevKey: string | undefined;
        let newFiltered: FilterResult = null;

        if (prevValue) {
          const parsedLine = ParsedLogLine.parse(JSON.parse(prevValue));
          const filtered = mapFilter({key, line: parsedLine});

          prevKey = filtered?.key;
        }

        if (lastValue) {
          const parsedLine = ParsedLogLine.parse(JSON.parse(lastValue));
          newFiltered = mapFilter({key, line: parsedLine});
        }

        if (!newFiltered) {
          if (prevKey !== undefined) {
            updates.push({key: prevKey, value: null});
          }

          continue;
        }

        if (prevKey && newFiltered.key !== prevKey) {
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
      updateReaders: [{readerId: parsedLinesReaderName, generationId}],
    });
  };
};
