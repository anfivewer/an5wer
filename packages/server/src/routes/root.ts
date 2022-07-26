import {HttpResultType} from '@-/util/src/http-server/types';
import {Logger} from '@-/util/src/logging/types';
import {Context} from '../types/context';
import {FiestaRenderPage} from '@-/site/src/entries/types';

export const registerRootRoute = ({
  context,
}: {
  context: Context;
  logger: Logger;
}) => {
  const {httpServer, siteRenderer} = context;

  httpServer.routesGet.addStaticRoute('/', {
    handler: async ({url}) => {
      const html = await siteRenderer.render({
        page: FiestaRenderPage.root,
        request: {url},
      });

      return {
        type: HttpResultType.html,
        html,
      };
    },
  });
};
