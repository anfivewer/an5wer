import {Context} from '../context/types';
import {
  LOG_LINES_COLLECTION_NAME,
  PARSED_LINES_COLLECTION_NAME,
  PARSED_LINES_LOG_LINES_READER_NAME,
} from '../database/structure';
import {diffCollection} from '@-/diffbelt-server/src/util/database/queries/diff';
import {KeyValueUpdate} from '@-/diffbelt-types/src/database/types';
import {maybeParseLogLine} from '@-/util/src/logging/parser';

export const transformLogsLinesToParsedLines = async ({
  context,
}: {
  context: Context;
}): Promise<void> => {
  const {database} = context;
  const db = database.getDiffbelt();

  const [logLinesCollection, parsedLinesCollection] = await Promise.all([
    db.getCollection(LOG_LINES_COLLECTION_NAME),
    db.getCollection(PARSED_LINES_COLLECTION_NAME),
  ]);

  const {stream, generationId} = await diffCollection(logLinesCollection, {
    diffOptions: {
      readerId: PARSED_LINES_LOG_LINES_READER_NAME,
      readerCollectionName: PARSED_LINES_COLLECTION_NAME,
    },
  });

  await parsedLinesCollection.startGeneration({
    generationId,
    abortOutdated: true,
  });

  for await (const diffs of stream) {
    const updates: KeyValueUpdate[] = [];

    for (const {key, values} of diffs) {
      const parsedLine = maybeParseLogLine(key);
      if (!parsedLine) {
        continue;
      }

      const {timestampString, loggerKey} = parsedLine;

      const loggerKeyFirstPart = loggerKey.replace(/:.*$/, '');

      const parsedKey = `${timestampString} ${loggerKeyFirstPart}`;
      const isDeleted = values[values.length - 1] === null;

      if (isDeleted) {
        updates.push({key: parsedKey, value: null});
        continue;
      }

      updates.push({key: parsedKey, value: JSON.stringify(parsedLine)});
    }

    if (updates.length) {
      await parsedLinesCollection.putMany({items: updates, generationId});
    }
  }

  await parsedLinesCollection.commitGeneration({
    generationId,
    updateReaders: [
      {readerId: PARSED_LINES_LOG_LINES_READER_NAME, generationId},
    ],
  });
};
