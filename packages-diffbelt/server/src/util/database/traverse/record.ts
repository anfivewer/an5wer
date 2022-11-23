import {goToInsertPosition} from './insertion';
import {TraverserApi} from './types';

export const findRecordInCurrentKey = (options: {
  api: TraverserApi;
  generationId: string;
  exactGenerationId?: boolean;
  phantomId?: string;
  exactPhantomId?: boolean;
}): boolean => {
  const {api} = options;

  const {
    generationId,
    exactGenerationId = false,
    phantomId,
    exactPhantomId = false,
  } = options;

  const offsetType = goToInsertPosition({
    api,
    key: api.getItem().key,
    generationId,
    phantomId,
  });

  if (exactGenerationId && exactPhantomId) {
    return offsetType === 0;
  }

  const {generationId: itemGenerationId, phantomId: itemPhantomId} =
    api.getItem();

  return (
    (exactGenerationId ? itemGenerationId === generationId : true) &&
    (exactPhantomId ? itemPhantomId === phantomId : true)
  );
};
