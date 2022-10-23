import {CarEvent} from '@-/fiesta-types/src/data/events';
import {DirectusLoginResponse} from '@-/types/src/directus/auth/login';
import {DirectusItemsErrorResponse} from '@-/types/src/directus/items/errors';
import {AuthError, CreateEventIdNotUniqueError} from '../errors';

export class DirectusApi {
  private directusUrl: string;
  private accessToken: string | undefined;
  private refreshToken: string | undefined;
  private onTokenRefreshed?: (data: DirectusLoginResponse) => void;

  constructor({
    directusUrl,
    accessToken,
    refreshToken,
    onTokenRefreshed,
  }: {
    directusUrl: string;
    accessToken?: string;
    refreshToken?: string;
    onTokenRefreshed?: (data: DirectusLoginResponse) => void;
  }) {
    this.directusUrl = directusUrl;
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.onTokenRefreshed = onTokenRefreshed;
  }

  setDirectusUrl(url: string) {
    this.directusUrl = url;
  }

  setAccessToken(token: string | undefined) {
    this.accessToken = token;
  }

  setRefreshToken(token: string | undefined) {
    this.refreshToken = token;
  }

  async login(data: {email: string; password: string}) {
    const response = await this.apiCall('/auth/login', data, {withAuth: false});
    return DirectusLoginResponse.parse(response);
  }

  async createEvent(event: CarEvent) {
    await this.apiCall('/items/events', event);
  }

  private async apiCall(
    path: string,
    data: Record<string, unknown>,
    {
      withAuth = true,
      isTokenRefresh = false,
    }: {withAuth?: boolean; isTokenRefresh?: boolean} = {},
  ): Promise<unknown> {
    while (true) {
      const authHeaders =
        withAuth && this.accessToken
          ? {Authorization: `Bearer ${this.accessToken}`}
          : undefined;

      if (withAuth && !authHeaders) {
        throw new AuthError();
      }

      const response: Awaited<ReturnType<typeof fetch>> = await fetch(
        `${this.directusUrl}${path}`,
        {
          method: 'POST',
          headers: {'Content-Type': 'application/json', ...authHeaders},
          body: JSON.stringify(data),
        },
      );
      const responseData: unknown = await response.json();

      if (response.status !== 200) {
        const parsedResponse =
          DirectusItemsErrorResponse.safeParse(responseData);
        if (parsedResponse.success) {
          const isNonUniqueId = parsedResponse.data.errors.some(
            (error) => error.extensions.code === 'RECORD_NOT_UNIQUE',
          );
          if (isNonUniqueId) {
            throw new CreateEventIdNotUniqueError();
          }

          const isAuthProblem = parsedResponse.data.errors.some(
            (error) =>
              error.extensions.code === 'FORBIDDEN' ||
              error.extensions.code === 'INVALID_CREDENTIALS',
          );
          if (isAuthProblem) {
            throw new AuthError();
          }

          if (!isTokenRefresh) {
            const isTokenExpired = parsedResponse.data.errors.some(
              (error) => error.extensions.code === 'TOKEN_EXPIRED',
            );
            if (isTokenExpired) {
              const refreshData = await this.apiCall(
                '/auth/refresh',
                {refresh_token: this.refreshToken, mode: 'json'},
                {withAuth: false, isTokenRefresh: true},
              );

              const parsed = DirectusLoginResponse.parse(refreshData);
              const {
                data: {accessToken, refreshToken},
              } = parsed;

              this.accessToken = accessToken;
              this.refreshToken = refreshToken;

              this.onTokenRefreshed?.(parsed);

              // Retry api call with new token
              continue;
            }
          }
        }

        console.error('apiCall', response.status, responseData);
        throw new Error();
      }

      return responseData;
    }
  }
}
