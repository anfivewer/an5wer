import {FiestaRenderPage} from '@-/fiesta-types/src/site/pages';
import {HttpResultType} from '@-/util/src/http-server/types';
import {Logger} from '@-/types/src/logging/logging';
import {Context} from '../types/context';

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
        type: HttpResultType.html as const,
        html,
      };
    },
  });
};
