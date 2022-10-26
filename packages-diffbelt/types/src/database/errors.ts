import {createCustomError} from '@-/types/src/errors/util';

export const NoSuchCollectionError = createCustomError('NoSuchCollectionError');
export const CollectionAlreadyExistsError = createCustomError(
  'CollectionAlreadyExistsError',
);
export const NoSuchCursorError = createCustomError('NoSuchCursorError');
export const OutdatedGenerationError = createCustomError(
  'OutdatedGenerationError',
);
export const NextGenerationIsNotStartedError = createCustomError(
  'NextGenerationIsNotStartedError',
);
export const CannotPutInManualCollectionError = createCustomError(
  'CannotPutInManualCollectionError',
);
export const GenerationIsAbortingError = createCustomError(
  'GenerationIsAbortingError',
);
export const NoSuchReaderError = createCustomError('NoSuchReaderError');
export const CursorCrashedError = createCustomError('CursorCrashedError');
