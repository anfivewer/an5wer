import {FiestaRenderPage} from '@-/fiesta-types/src/site/pages';
import {HttpResultType} from '@-/util/src/http-server/types';
import {Logger} from '@-/util/src/logging/types';
import {Context} from '../types/context';

export const registerAdminRoute = ({
  context,
}: {
  context: Context;
  logger: Logger;
}) => {
  const {
    httpServer,
    siteRenderer,
    config: {adminPath},
  } = context;

  httpServer.routesGet.addStaticRoute(`${adminPath}/`, {
    handler: async ({url}) => {
      const html = await siteRenderer.render({
        page: FiestaRenderPage.admin,
        request: {url},
      });

      return {
        type: HttpResultType.html as const,
        html,
      };
    },
  });
};
