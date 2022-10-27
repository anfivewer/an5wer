import {FinishableStream, ReadOnlyStream} from '@-/types/src/stream/stream';
import {Readable} from 'stream';
import {createFinishableStream} from './finishable-stream';
import {readableStringsToAsyncStream} from './node-stream-to-async';

const DEFAULT_MAX_LINE_LENGTH = 4 * 1024 * 1024;

export const createLinesStream = ({
  stream: readOnlyInputStream,
  finishableStream: finishableInputStream,
  maxLineLength = DEFAULT_MAX_LINE_LENGTH,
}: (
  | {stream: ReadOnlyStream<string>; finishableStream?: undefined}
  | {finishableStream: FinishableStream<string>; stream?: undefined}
) & {
  // Will throw exception if line will exceed this value
  maxLineLength?: number;
}): FinishableStream<string> => {
  const inputStream = finishableInputStream || readOnlyInputStream;

  const stream = createFinishableStream<string>({
    onClosed() {
      finishableInputStream?.next('finish');
    },
    fullnessItemsCount: 8,
  });

  let totalChunksLength = 0;
  let chunks: string[] = [];

  const pushChunk = (str: string): void => {
    totalChunksLength += str.length;

    if (totalChunksLength > maxLineLength) {
      throw new Error('createLinesStream maxLineHeight reached');
    }

    chunks.push(str);
  };

  const onData = async (data: string): Promise<void> => {
    if (!data) {
      return;
    }

    const chunkLines = data.split('\n');
    if (chunkLines.length === 1) {
      pushChunk(data);
    } else {
      const firstLine = chunks.join('') + chunkLines[0];
      stream.push(firstLine);

      for (let i = 1; i < chunkLines.length - 1; i++) {
        const line = chunkLines[i];
        stream.push(line);
      }

      const lastLine = chunkLines[chunkLines.length - 1];
      chunks = [lastLine];
      totalChunksLength = lastLine.length;
    }

    await stream.onNotFull();
  };

  (async () => {
    for await (const data of inputStream) {
      await onData(data);
    }

    if (chunks.length) {
      stream.push(chunks.join(''));
    }

    stream.finish();
  })().catch((error) => {
    stream.destroyWithError(error);
    finishableInputStream?.next('finish');
  });

  return stream.getGenerator();
};

export const createReadableLinesStream = ({
  stream: readable,
  maxLineLength,
}: {
  stream: Readable;
  /** @deprecated */
  bufferSize?: number;
  // Will throw exception if line will exceed this value
  maxLineLength?: number;
}): {
  getGenerator: () => AsyncGenerator<string, void, void>;
  destroy: () => void;
} => {
  readable.setEncoding('utf8');

  const stream = createLinesStream({
    stream: readableStringsToAsyncStream(readable),
    maxLineLength,
  });

  return {
    getGenerator: () => stream,
    destroy: () => {
      stream.next('finish');
    },
  };
};
