import {Stats} from 'fs';
import {stat} from 'fs/promises';
import {IOError} from '@-/types/src/errors/io';

export const isFileExists = async (path: string): Promise<boolean> => {
  let s: Stats;

  try {
    s = await stat(path);
  } catch (error) {
    const ioError = IOError.safeParse(error);
    if (ioError.success && ioError.data.code === 'ENOENT') {
      return false;
    }

    throw error;
  }

  if (!s.isFile()) {
    throw new Error(`${path} is not a file`);
  }

  return true;
};
