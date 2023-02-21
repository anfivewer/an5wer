import {
  Collection,
  DiffOptions,
  DiffResultItems,
  EncodedValue,
  EncodingType,
} from '@-/diffbelt-types/src/database/types';
import {FinishableStream} from '@-/types/src/stream/stream';
import {createFinishableStream} from '@-/util/src/stream/finishable-stream';

export const diffCollection = async (
  collection: Collection,
  {
    diffOptions,
    onInitialQuery,
    onReadCursor,
  }: {
    diffOptions: DiffOptions;
    onInitialQuery?: (options: {generationId: string}) => void;
    onReadCursor?: (options: {generationId: string}) => void;
  },
): Promise<{
  fromGenerationId: EncodedValue;
  generationId: string;
  generationIdEncoding: EncodingType | undefined;
  stream: FinishableStream<DiffResultItems>;
}> => {
  const {
    fromGenerationId,
    generationId: initialGenerationId,
    generationIdEncoding,
    items,
    cursorId,
  } = await collection.diff(diffOptions);

  onInitialQuery?.({generationId: initialGenerationId});

  let isClosed = false;
  const stream = createFinishableStream<DiffResultItems>({
    onClosed: () => {
      isClosed = true;
    },
  });

  stream.push(items);

  (async () => {
    let currentCursor = cursorId;

    while (currentCursor !== undefined) {
      const {generationId, items, cursorId} = await collection.readDiffCursor({
        cursorId: currentCursor,
      });

      if (isClosed) {
        return;
      }

      onReadCursor?.({generationId});

      stream.push(items);

      currentCursor = cursorId;
    }

    stream.finish();
  })().catch(stream.destroyWithError.bind(stream));

  return {
    fromGenerationId,
    generationId: initialGenerationId,
    generationIdEncoding,
    stream: stream.getGenerator(),
  };
};
