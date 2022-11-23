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
export const NoSuchReaderError = createCustomError('NoSuchReaderError');
export const CursorCrashedError = createCustomError('CursorCrashedError');
export const UnsupportedActionOnNonManualCollectionError = createCustomError(
  'UnsupportedActionOnNonManualCollectionError',
);
export const NoSuchPhantomError = createCustomError('NoSuchPhantomError');
