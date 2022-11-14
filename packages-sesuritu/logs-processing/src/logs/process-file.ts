import {binarySearchIterator} from '@-/util/src/array/binary-search';
import {
  createReadableLinesStream,
  DEFAULT_MAX_LINE_LENGTH,
} from '@-/util/src/stream/lines-stream';
import {createReadStream} from 'fs';
import {FileHandle, open} from 'fs/promises';
import {Database} from '../database/database';
import {LOG_LINES_COLLECTION_NAME} from '../database/structure';
import {
  LinesNormalizer,
  NormalizedLogLine,
  normalizeLine,
} from './lines-normalizer';

const BUFFER_SIZE = 4096;

export const processLogFile = async ({
  path,
  database,
}: {
  path: string;
  database: Database;
}) => {
  const fd = await open(path, 'r');

  const position = await (async () => {
    try {
      return await processLogFileInternal({fd, database});
    } finally {
      await fd.close();
    }
  })();

  if (position < 0) {
    return;
  }

  // We found line which we are not seen yet, add them to the database
  const linesNormalizer = new LinesNormalizer();
  const rs = createReadStream(path, {
    encoding: 'utf8',
    start: position,
  });

  const linesStream = createReadableLinesStream({stream: rs});

  for await (const line of linesStream) {
    const normalizedLine = linesNormalizer.normalizeLine(line);

    if (!normalizedLine) {
      continue;
    }

    database.addLine(normalizedLine);
  }
};

// Returns position from which we should add log lines
const processLogFileInternal = async ({
  fd,
  database,
}: {
  fd: FileHandle;
  database: Database;
}): Promise<number> => {
  const {size} = await fd.stat();

  if (!size) {
    throw new Error('file system does not supports getting size of file');
  }

  const buffers = [Buffer.allocUnsafe(BUFFER_SIZE)];
  let bufferIndex = -1;

  const getBuffer = () => {
    bufferIndex++;

    if (bufferIndex < buffers.length) {
      return buffers[bufferIndex];
    }

    const buffer = Buffer.allocUnsafe(BUFFER_SIZE);
    buffers.push(buffer);
    return buffer;
  };

  const resetBuffers = () => {
    bufferIndex = -1;
  };

  const last = await findLastLineWithTimestamp({
    fd,
    size,
    getBuffer,
    resetBuffers,
  });

  if (last === null) {
    throw new Error(`Bad log file, no last line`);
  }

  const diffbelt = database.getDiffbelt();

  const logLinesCollection = await diffbelt.getCollection(
    LOG_LINES_COLLECTION_NAME,
  );

  const lastLineResult = await logLinesCollection.get({key: last.line});

  if (lastLineResult.item) {
    // Last line of log already added, skip it
    return -1;
  }

  const first = await findFirstLineWithTimestamp({fd, getBuffer, resetBuffers});

  if (first === null) {
    throw new Error(`Bad log file, no last line`);
  }

  // do a binary search to find last line that we are not added
  // TODO: we can optimize it and do not read whole buffer to find single line
  //       to reuse already read buffers in the end of search

  const iterator = binarySearchIterator({
    fromIndexInclusive: first.position,
    toIndexExclusive: last.position,
  });

  let lastLineStart = Infinity;
  let lastLineEnd = -Infinity;

  let {value: position, done} = iterator.next();

  while (!done) {
    if (lastLineStart <= position && position <= lastLineEnd) {
      break;
    }

    const maybeLine = await findLastLineWithTimestamp({
      fd,
      size: position,
      getBuffer,
      resetBuffers,
    });
    if (!maybeLine) {
      throw new Error('cannot find even first line');
    }

    const {line, position: foundLinePosition, nextLinePosition} = maybeLine;
    lastLineStart = foundLinePosition;
    lastLineEnd = nextLinePosition;

    const lineResult = await logLinesCollection.get({key: line});
    if (lineResult.item) {
      ({value: position, done} = iterator.next({
        comparison: 1,
        hintLeftInclusive: nextLinePosition,
      }));
      continue;
    }

    if (
      foundLinePosition >= last.position ||
      foundLinePosition <= first.nextLinePosition
    ) {
      break;
    }

    ({value: position, done} = iterator.next({
      comparison: -1,
      hintRightInclusive: foundLinePosition - 1,
    }));
  }

  if (!isFinite(lastLineStart)) {
    throw new Error('last line not found');
  }

  return lastLineStart;
};

const findFirstLineWithTimestamp = async ({
  fd,
  getBuffer,
  resetBuffers,
}: {
  fd: FileHandle;
  getBuffer: () => Buffer;
  resetBuffers: () => void;
}): Promise<{
  line: NormalizedLogLine;
  position: number;
  nextLinePosition: number;
} | null> => {
  let pos = 0;

  while (true) {
    resetBuffers();
    const position = pos;
    const maybeLine = await readLineAt({fd, position, getBuffer});
    if (!maybeLine) {
      return null;
    }

    const {line, byteLength} = maybeLine;

    pos += byteLength + 1;

    const normalized = normalizeLine(line);
    if (!normalized) {
      continue;
    }

    return {line: normalized, position, nextLinePosition: pos};
  }
};

const findLastLineWithTimestamp = async ({
  fd,
  size,
  getBuffer,
  resetBuffers,
}: {
  fd: FileHandle;
  size: number;
  getBuffer: () => Buffer;
  resetBuffers: () => void;
}): Promise<{
  line: NormalizedLogLine;
  position: number;
  nextLinePosition: number;
} | null> => {
  let pos = size;

  while (true) {
    resetBuffers();
    pos = await findLineStartAt({fd, position: pos, getBuffer});

    if (pos < 0) {
      return null;
    }

    resetBuffers();
    const maybeLine = await readLineAt({fd, position: pos, getBuffer});

    pos -= 1;

    if (maybeLine === null) {
      if (pos < 0) {
        return null;
      }
      continue;
    }

    const {line, byteLength} = maybeLine;

    const normalized = normalizeLine(line);
    if (!normalized) {
      continue;
    }

    return {
      line: normalized,
      position: pos + 1,
      nextLinePosition: pos + 1 + byteLength + 1,
    };
  }
};

const findLineStartAt = async ({
  fd,
  position: initialPosition,
  getBuffer,
}: {
  fd: FileHandle;
  position: number;
  getBuffer: () => Buffer;
}) => {
  const buffer = getBuffer();

  let position = Math.max(0, initialPosition - buffer.byteLength);
  let readFromPosition = position;
  let readToPosition = initialPosition;

  while (true) {
    const {bytesRead} = await fd.read(
      buffer,
      0,
      Math.min(buffer.byteLength, readToPosition - position),
      position,
    );
    if (!bytesRead) {
      return -1;
    }

    let pos = -1;
    let lastPosBeforeBytesRead = -1;
    const prevPosition = position;

    while (true) {
      pos = buffer.indexOf('\n', pos + 1);

      if (pos < 0) {
        position += bytesRead;

        if (position >= readToPosition) {
          readToPosition = position;
          position = readFromPosition - buffer.byteLength;
          readFromPosition = position;

          if (readToPosition <= 0) {
            return 0;
          }
        }

        break;
      }

      if (pos < bytesRead) {
        lastPosBeforeBytesRead = pos;
      }
    }

    if (lastPosBeforeBytesRead >= 0) {
      return prevPosition + lastPosBeforeBytesRead + 1;
    }
  }
};

const readLineAt = async ({
  fd,
  position: initialPosition,
  getBuffer,
}: {
  fd: FileHandle;
  position: number;
  getBuffer: () => Buffer;
}) => {
  const buffers: Buffer[] = [];

  let position = initialPosition;
  let lastBufferOffset = 0;
  let totalLength = 0;

  let buffer = getBuffer();
  buffers.push(buffer);

  while (true) {
    const {bytesRead} = await fd.read(
      buffer,
      lastBufferOffset,
      buffer.byteLength - lastBufferOffset,
      position,
    );
    if (!bytesRead) {
      return null;
    }

    const pos = buffer.indexOf(0x0a, lastBufferOffset);

    if (pos < 0 && totalLength >= DEFAULT_MAX_LINE_LENGTH) {
      throw new Error('max line length exceeded');
    }

    if (pos < bytesRead) {
      totalLength = totalLength + (pos - lastBufferOffset);
      break;
    }

    lastBufferOffset += bytesRead;
    totalLength += bytesRead;
    position += bytesRead;

    if (lastBufferOffset >= buffer.byteLength) {
      buffer = getBuffer();
      buffers.push(buffer);
      lastBufferOffset = 0;
    }

    if (pos < 0) {
      // Line end not found, continue
      continue;
    }
  }

  // TODO: Use strings decoder?
  const concated = Buffer.concat(buffers, totalLength);

  return {line: concated.toString('utf8'), byteLength: totalLength};
};
