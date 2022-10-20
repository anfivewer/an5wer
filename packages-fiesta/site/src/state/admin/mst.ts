import {types, Instance, flow} from 'mobx-state-tree';
import {getLocalStorageProperty} from '@-/util/src/storage/local-storage';
import {DirectusLoginResponse} from '@-/types/src/directus/auth/login';
import {CarEvent} from '@-/fiesta-types/src/data/events';
import {assertNonNullable} from '@-/types/src/assert/runtime';
import {DirectusItemsErrorResponse} from '@-/types/src/directus/items/errors';
import {AuthError, CreateEventIdNotUniqueError} from './errors';

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

        const response: Awaited<ReturnType<typeof fetch>> = yield fetch(
          `${self.directusUrl}/auth/login`,
          {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
              email,
              password,
            }),
          },
        );
        const data: unknown = yield response.json();

        const {
          data: {accessToken, refreshToken},
        } = DirectusLoginResponse.parse(data);

        self.auth = AuthMst.create({
          accessToken,
          refreshToken,
        });
        self.isLoginActive = false;
        self.page = RootPageMst.create({name: 'root'});

        accessTokenProperty.set(accessToken);
        refreshTokenProperty.set(refreshToken);
      }),

      logout,

      createEvent: flow(function* (event: CarEvent) {
        const {directusUrl, auth} = self;

        assertNonNullable(auth, 'createEvent: no auth');

        self.isActionCreationActive = true;

        try {
          const response: Awaited<ReturnType<typeof fetch>> = yield fetch(
            `${directusUrl}/items/events`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${auth.accessToken}`,
              },
              body: JSON.stringify(event),
            },
          );
          const data: unknown = yield response.json();

          if (response.status !== 200) {
            const parsedResponse = DirectusItemsErrorResponse.safeParse(data);
            if (parsedResponse.success) {
              const isNonUniqueId = parsedResponse.data.errors.some(
                (error) => error.extensions.code === 'RECORD_NOT_UNIQUE',
              );
              if (isNonUniqueId) {
                throw new CreateEventIdNotUniqueError();
              }

              const isAuthProblem = parsedResponse.data.errors.some(
                (error) => error.extensions.code === 'FORBIDDEN',
              );
              if (isAuthProblem) {
                logout();
                throw new AuthError();
              }
            }

            console.error('createEvent', response.status, data);
            throw new Error();
          }
        } finally {
          self.isActionCreationActive = false;
        }
      }),
    };
  });
export type AdminMst = Instance<typeof AdminMst>;
