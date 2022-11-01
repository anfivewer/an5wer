import {
  KICKS_COLLECTION_NAME,
  KICKS_PARSED_LINES_READER_NAME,
} from '../database/structure';
import {KicksCollectionItem} from '../types/collections/kicks';
import {createParsedLinesFilterTransform} from './helpers/filter-parsed-lines';

export const transformParsedLinesToKicks = createParsedLinesFilterTransform({
  targetCollectionName: KICKS_COLLECTION_NAME,
  parsedLinesReaderName: KICKS_PARSED_LINES_READER_NAME,
  mapFilter: ({key, line: {logKey, props}}) => {
    if (logKey !== 'kick') {
      return null;
    }

    const {reason, chatId, userId} = props;

    if (!reason || !chatId || !userId) {
      return null;
    }

    const value: KicksCollectionItem = {
      reason,
      chatId,
      userId,
    };

    return {key, value: JSON.stringify(value)};
  },
});
