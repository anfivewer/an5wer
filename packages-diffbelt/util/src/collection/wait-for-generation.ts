import {Collection, EncodedValue} from '@-/diffbelt-types/src/database/types';
import {isGreaterOrEqualThan} from '../keys/compare';

export const waitForGeneration = async ({
  collection,
  generationId,
}: {
  collection: Collection;
  generationId: EncodedValue;
}) => {
  const stream = collection.getGenerationStream();

  for await (const currentGenerationId of stream) {
    const isGte = isGreaterOrEqualThan(
      currentGenerationId.generationId,
      generationId,
    );

    if (isGte) {
      stream.next('finish');
      return;
    }
  }
};
