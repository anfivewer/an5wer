import {FiestaRenderPage} from '@-/fiesta-types/src/site/pages';
import {RequestData} from '@-/fiesta-types/src/site/render';
import {Context} from '../types/context';

export type SiteRenderer = {
  init: (options: {context: Context}) => Promise<void>;
  render: (options: {
    page: FiestaRenderPage;
    request: RequestData;
  }) => Promise<string>;
};
