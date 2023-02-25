import {
  Collection,
  DiffOptions,
  DiffResultItems,
  EncodedValue,
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
    onInitialQuery?: (options: {generationId: EncodedValue}) => void;
    onReadCursor?: (options: {generationId: EncodedValue}) => void;
  },
): Promise<{
  fromGenerationId: EncodedValue;
  toGenerationId: EncodedValue;
  stream: FinishableStream<DiffResultItems>;
}> => {
  const {
    fromGenerationId,
    toGenerationId: initialGenerationId,
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
      const {toGenerationId, items, cursorId} = await collection.readDiffCursor(
        {
          cursorId: currentCursor,
        },
      );

      if (isClosed) {
        return;
      }

      onReadCursor?.({generationId: toGenerationId});

      stream.push(items);

      currentCursor = cursorId;
    }

    stream.finish();
  })().catch(stream.destroyWithError.bind(stream));

  return {
    fromGenerationId,
    toGenerationId: initialGenerationId,
    stream: stream.getGenerator(),
  };
};
