import { SignJWT, importPKCS8 } from "jose";
import type { MeetupAuthProvider } from "./provider.ts";
import { requestOAuthToken } from "./utils.ts";

export type OAuthJwtBearerAuthProviderOptions = {
  clientKey: string;
  authorizedMemberId: string;
  signingKeyId: string;
  privateKeyPem: string;
  tokenEndpoint?: string;
  tokenTtlSeconds?: number;
};

export class OAuthJwtBearerAuthProvider implements MeetupAuthProvider {
  private cachedToken: { accessToken: string; expiresAt: number } | null = null;
  private inflightRequest: Promise<string> | null = null;
  private cachedPrivateKey: Promise<CryptoKey> | null = null;

  constructor(private readonly options: OAuthJwtBearerAuthProviderOptions) {}

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
    const assertion = await this.createAssertion();
    const endpoint = this.options.tokenEndpoint ?? "https://secure.meetup.com/oauth2/access";

    const tokenResponse = await requestOAuthToken(
      endpoint,
      new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
    );

    this.cachedToken = {
      accessToken: tokenResponse.access_token,
      expiresAt: Date.now() + tokenResponse.expires_in * 1_000,
    };

    return tokenResponse.access_token;
  }

  private getPrivateKey(): Promise<CryptoKey> {
    if (this.cachedPrivateKey === null) {
      this.cachedPrivateKey = importPKCS8(this.options.privateKeyPem, "RS256");
    }
    return this.cachedPrivateKey;
  }

  private async createAssertion(): Promise<string> {
    const privateKey = await this.getPrivateKey();

    return new SignJWT({})
      .setProtectedHeader({ alg: "RS256", typ: "JWT", kid: this.options.signingKeyId })
      .setIssuer(this.options.clientKey)
      .setSubject(this.options.authorizedMemberId)
      .setAudience("api.meetup.com")
      .setExpirationTime(`${this.options.tokenTtlSeconds ?? 120}s`)
      .sign(privateKey);
  }
}
