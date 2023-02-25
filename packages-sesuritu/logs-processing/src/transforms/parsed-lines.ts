import {Context} from '../context/types';
import {
  LOG_LINES_COLLECTION_NAME,
  PARSED_LINES_COLLECTION_NAME,
  PARSED_LINES_LOG_LINES_READER_NAME,
} from '../database/structure';
import {diffCollection} from '@-/diffbelt-util/src/queries/diff';
import {KeyValueUpdate} from '@-/diffbelt-types/src/database/types';
import {maybeParseLogLine} from '@-/util/src/logging/parser';
import {isEqual} from '@-/diffbelt-util/src/keys/compare';
import {toString} from '@-/diffbelt-util/src/keys/encoding';

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

  while (true) {
    const {stream, fromGenerationId, toGenerationId} = await diffCollection(
      logLinesCollection,
      {
        diffOptions: {
          fromReader: {
            readerId: PARSED_LINES_LOG_LINES_READER_NAME,
            collectionName: PARSED_LINES_COLLECTION_NAME,
          },
        },
      },
    );

    if (isEqual(fromGenerationId, toGenerationId)) {
      return;
    }

    await parsedLinesCollection.startGeneration({
      generationId: toGenerationId,
      abortOutdated: true,
    });

    for await (const diffs of stream) {
      const updates: KeyValueUpdate[] = [];

      for (const {key, toValue} of diffs) {
        const parsedLine = maybeParseLogLine(toString(key));
        if (!parsedLine) {
          continue;
        }

        const {timestampString, loggerKey} = parsedLine;

        const loggerKeyFirstPart = loggerKey.replace(/:.*$/, '');

        const parsedKey = `${timestampString} ${loggerKeyFirstPart}`;
        const isDeleted = toValue === null;

        if (isDeleted) {
          updates.push({key: {value: parsedKey}, value: null});
          continue;
        }

        updates.push({
          key: {value: parsedKey},
          value: {value: JSON.stringify(parsedLine)},
        });
      }

      if (updates.length) {
        await parsedLinesCollection.putMany({
          items: updates,
          generationId: toGenerationId,
        });
      }
    }

    await parsedLinesCollection.commitGeneration({
      generationId: toGenerationId,
      updateReaders: [
        {
          readerId: PARSED_LINES_LOG_LINES_READER_NAME,
          generationId: toGenerationId,
        },
      ],
    });
  }
};
