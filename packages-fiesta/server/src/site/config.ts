import {Config} from '@-/fiesta-types/src/server/config';
import {FiestaRenderConfig} from '@-/fiesta-types/src/site/render';

export const pickConfig = ({
  adminPath,
  directusPath,
}: Config): FiestaRenderConfig => {
  return {adminPath, directusPath};
};
