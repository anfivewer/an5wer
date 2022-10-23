import {autorun} from 'mobx';
import {types, Instance, flow, addDisposer, applyAction} from 'mobx-state-tree';
import {getLocalStorageProperty} from '@-/util/src/storage/local-storage';
import {CarEvent} from '@-/fiesta-types/src/data/events';
import {AuthError} from './errors';
import {DirectusApi} from './api/api';
import {DirectusLoginResponse} from '@-/types/src/directus/auth/login';

export const AuthMst = types.model({
  accessToken: types.string,
  refreshToken: types.string,
});

const NotAuthorizedPageMst = types.model({
  name: types.literal('notAuthorized'),
});

const RootPageMst = types.model({
  name: types.literal('root'),
});

export const AdminMst = types
  .model({
    page: types.optional(types.union(NotAuthorizedPageMst, RootPageMst), {
      name: 'notAuthorized',
    }),
    auth: types.maybe(AuthMst),
    directusUrl: types.string,
    isLoginActive: types.optional(types.boolean, false),
    isActionCreationActive: types.optional(types.boolean, false),
  })
  .actions((self) => {
    const accessTokenProperty = getLocalStorageProperty('fiesta_access_token');
    const refreshTokenProperty = getLocalStorageProperty(
      'fiesta_refresh_token',
    );

    const logout = () => {
      self.auth = undefined;
      self.page = NotAuthorizedPageMst.create({name: 'notAuthorized'});
      accessTokenProperty.set(null);
      refreshTokenProperty.set(null);
    };

    const _afterLogin = ({
      data: {accessToken, refreshToken},
    }: DirectusLoginResponse) => {
      self.auth = AuthMst.create({
        accessToken,
        refreshToken,
      });

      accessTokenProperty.set(accessToken);
      refreshTokenProperty.set(refreshToken);
    };

    const api = new DirectusApi({
      directusUrl: self.directusUrl,
      onTokenRefreshed: (loginData) => {
        applyAction(self, {
          name: '_afterLogin',
          args: [loginData],
        });
      },
    });

    const dispose = autorun(() => {
      const {directusUrl, auth} = self;
      const {accessToken, refreshToken} = auth || {};

      api.setDirectusUrl(directusUrl);
      api.setAccessToken(accessToken);
      api.setRefreshToken(refreshToken);
    });
    addDisposer(self, dispose);

    return {
      init: () => {
        if (self.auth) {
          return true;
        }

        const accessToken = accessTokenProperty.get();
        const refreshToken = refreshTokenProperty.get();

        if (!accessToken || !refreshToken) {
          return false;
        }

        self.auth = AuthMst.create({accessToken, refreshToken});
        self.page = RootPageMst.create({name: 'root'});
        return true;
      },
      login: flow(function* ({
        email,
        password,
      }: {
        email: string;
        password: string;
      }) {
        if (self.isLoginActive) {
          return;
        }

        self.isLoginActive = true;

        const response: Awaited<ReturnType<typeof api.login>> = yield api.login(
          {email, password},
        );

        _afterLogin(response);

        self.isLoginActive = false;
        self.page = RootPageMst.create({name: 'root'});
      }),

      _afterLogin,

      logout,

      createEvent: flow(function* (event: CarEvent) {
        self.isActionCreationActive = true;

        try {
          yield api.createEvent(event);
        } catch (error) {
          if (error instanceof AuthError) {
            logout();
          }

          throw error;
        } finally {
          self.isActionCreationActive = false;
        }
      }),
    };
  });
export type AdminMst = Instance<typeof AdminMst>;
