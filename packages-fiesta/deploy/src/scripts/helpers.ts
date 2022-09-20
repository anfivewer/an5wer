import {IOError} from '@-/types/src/errors/io';
import {readFile, writeFile} from 'fs/promises';
import {CONFIG_PATH} from './constants';
import {ExecutionConfig} from './types';

const defaultExecutionConfig: ExecutionConfig = {
  currentVersion: 0,
};

export const readExecutionConfig = async ({
  returnDefaultIfNotExists = false,
}: {returnDefaultIfNotExists?: boolean} = {}): Promise<ExecutionConfig> => {
  let content: string | undefined;

  try {
    content = await readFile(CONFIG_PATH, {encoding: 'utf8'});
  } catch (e) {
    const parsedError = IOError.safeParse(e);
    if (!parsedError.success || parsedError.data.code !== 'ENOENT') {
      throw e;
    }

    if (!returnDefaultIfNotExists) {
      throw e;
    }

    return defaultExecutionConfig;
  }

  return ExecutionConfig.parse(JSON.parse(content));
};

export const writeExecutionConfig = async (
  config: ExecutionConfig,
): Promise<void> => {
  await writeFile(CONFIG_PATH, JSON.stringify(config), {encoding: 'utf8'});
};
