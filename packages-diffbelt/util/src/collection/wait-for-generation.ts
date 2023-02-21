import {Collection, EncodingType} from '@-/diffbelt-types/src/database/types';
import {isGreaterOrEqualThan} from '../keys/compare';

export const waitForGeneration = async ({
  collection,
  generationId,
  generationIdEncoding,
}: {
  collection: Collection;
  generationId: string;
  generationIdEncoding: EncodingType | undefined;
}) => {
  const stream = collection.getGenerationStream();

  for await (const currentGenerationId of stream) {
    const isGte = isGreaterOrEqualThan(
      {
        key: currentGenerationId.generationId,
        encoding: currentGenerationId.generationIdEncoding,
      },
      {key: generationId, encoding: generationIdEncoding},
    );

    if (isGte) {
      stream.next('finish');
      return;
    }
  }
};
