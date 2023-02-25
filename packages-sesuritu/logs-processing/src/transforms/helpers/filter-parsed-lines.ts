import {ParsedLogLine} from '@-/types/src/logging/parsed-log';
import {Context} from '../../context/types';
import {PARSED_LINES_COLLECTION_NAME} from '../../database/structure';
import {createMapFilterTransform} from '@-/diffbelt-util/src/transform/map-filter';
import {toString} from '@-/diffbelt-util/src/keys/encoding';
import {EncodedValue} from '@-/diffbelt-types/src/database/types';

type FilterResult = {key: EncodedValue; value: EncodedValue | null} | null;

export const createParsedLinesFilterTransform = ({
  targetCollectionName,
  parsedLinesReaderName,
  mapFilter,
}: {
  targetCollectionName: string;
  parsedLinesReaderName: string;
  mapFilter: (options: {
    key: EncodedValue;
    line: ParsedLogLine;
  }) => FilterResult;
}): ((options: {context: Context}) => Promise<void>) => {
  return createMapFilterTransform({
    sourceCollectionName: PARSED_LINES_COLLECTION_NAME,
    targetCollectionName,
    targetCollectionReaderName: parsedLinesReaderName,
    parseSourceCollectionItem: (value) =>
      ParsedLogLine.parse(JSON.parse(toString(value))),
    getDatabaseFromContext: (context) => context.database.getDiffbelt(),
    mapFilter: ({key, value}) => mapFilter({key, line: value}),
  });
};
