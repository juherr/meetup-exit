import type { MeetupAuthProvider } from "./provider.ts";
import { requestOAuthToken } from "./utils.ts";

export type RefreshTokenStore = {
  getRefreshToken(): Promise<string>;
  saveRefreshToken(refreshToken: string): Promise<void>;
};

export type OAuthRefreshTokenAuthProviderOptions = {
  clientKey: string;
  clientSecret: string;
  tokenStore: RefreshTokenStore;
  tokenEndpoint?: string;
};

export class OAuthRefreshTokenAuthProvider implements MeetupAuthProvider {
  private cachedToken: { accessToken: string; expiresAt: number } | null = null;
  private inflightRequest: Promise<string> | null = null;

  constructor(private readonly options: OAuthRefreshTokenAuthProviderOptions) {}

  async getAccessToken(): Promise<string> {
    if (this.cachedToken !== null && this.cachedToken.expiresAt > Date.now() + 60_000) {
      return this.cachedToken.accessToken;
    }

    // Deduplicate concurrent token requests.
    if (this.inflightRequest === null) {
      this.inflightRequest = this.fetchNewToken().finally(() => {
        this.inflightRequest = null;
      });
    }

    return this.inflightRequest;
  }

  private async fetchNewToken(): Promise<string> {
    const refreshToken = await this.options.tokenStore.getRefreshToken();
    const endpoint = this.options.tokenEndpoint ?? "https://secure.meetup.com/oauth2/access";

    const tokenResponse = await requestOAuthToken(
      endpoint,
      new URLSearchParams({
        client_id: this.options.clientKey,
        client_secret: this.options.clientSecret,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    );

    // Meetup refresh tokens are single-use — persist the new one before caching.
    if (tokenResponse.refresh_token !== undefined) {
      await this.options.tokenStore.saveRefreshToken(tokenResponse.refresh_token);
    }

    this.cachedToken = {
      accessToken: tokenResponse.access_token,
      expiresAt: Date.now() + tokenResponse.expires_in * 1_000,
    };

    return tokenResponse.access_token;
  }
}
