# 04 — Authentification

## 1. Décision

Meetup GraphQL utilise OAuth 2 pour obtenir un access token. Les appels GraphQL utilisent ensuite:

```http
Authorization: Bearer {ACCESS_TOKEN}
```

Pour `meetup-exit`, le flow principal est:

```text
OAuth 2 JWT Bearer Flow
```

Motif:

- adapté au server-to-server;
- pas d'interaction utilisateur;
- correspond au cas d'un export interne du réseau appartenant au propriétaire de l'OAuth Client.

## 2. Flows supportés

### 2.1 `access-token`

Mode debug.

Configuration:

- `MEETUP_ACCESS_TOKEN`.

Usage:

```bash
meetup-exit verify-auth --auth access-token --access-token "$MEETUP_ACCESS_TOKEN"
```

Ne pas utiliser comme stratégie longue durée.

### 2.2 `jwt-bearer`

Mode cible MVP.

Configuration:

- `MEETUP_CLIENT_KEY`;
- `MEETUP_AUTHORIZED_MEMBER_ID`;
- `MEETUP_SIGNING_KEY_ID`;
- `MEETUP_PRIVATE_KEY_PATH` ou `MEETUP_PRIVATE_KEY`.

Le JWT signé doit contenir:

- `sub`: authorized member id;
- `iss`: client key;
- `aud`: `api.meetup.com`;
- `exp`: expiration courte, recommandation: 120 secondes.

Header:

- `kid`: signing key id;
- `typ`: `JWT`;
- `alg`: `RS256`.

Token endpoint:

```text
https://secure.meetup.com/oauth2/access
```

Request:

```http
POST /oauth2/access
Content-Type: application/x-www-form-urlencoded

grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer
&assertion={SIGNED_JWT}
```

### 2.3 `refresh-token`

Mode compatibilité.

Configuration:

- `MEETUP_CLIENT_KEY`;
- `MEETUP_CLIENT_SECRET`;
- refresh token initial;
- storage callback/file.

Important:

- le refresh token Meetup est single-use;
- il faut persister le nouveau refresh token à chaque refresh;
- une double utilisation invalide la session.

## 3. Interface TypeScript

```ts
export type MeetupAuthProvider = {
  getAccessToken(): Promise<string>;
};

export type MeetupAccessTokenResponse = {
  access_token: string;
  token_type: "bearer" | string;
  expires_in: number;
  refresh_token?: string;
};
```

## 4. AccessTokenAuthProvider

```ts
export class AccessTokenAuthProvider implements MeetupAuthProvider {
  constructor(private readonly accessToken: string) {}

  async getAccessToken(): Promise<string> {
    return this.accessToken;
  }
}
```

## 5. OAuthJwtBearerAuthProvider

Dépendance: `jose`.

```ts
import { SignJWT, importPKCS8 } from "jose";

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

  constructor(private readonly options: OAuthJwtBearerAuthProviderOptions) {}

  async getAccessToken(): Promise<string> {
    if (this.cachedToken && this.cachedToken.expiresAt > Date.now() + 60_000) {
      return this.cachedToken.accessToken;
    }

    const assertion = await this.createAssertion();
    const tokenResponse = await this.requestAccessToken(assertion);

    this.cachedToken = {
      accessToken: tokenResponse.access_token,
      expiresAt: Date.now() + tokenResponse.expires_in * 1_000,
    };

    return tokenResponse.access_token;
  }

  private async createAssertion(): Promise<string> {
    const privateKey = await importPKCS8(this.options.privateKeyPem, "RS256");

    return new SignJWT({})
      .setProtectedHeader({
        alg: "RS256",
        typ: "JWT",
        kid: this.options.signingKeyId,
      })
      .setIssuer(this.options.clientKey)
      .setSubject(this.options.authorizedMemberId)
      .setAudience("api.meetup.com")
      .setExpirationTime(`${this.options.tokenTtlSeconds ?? 120}s`)
      .sign(privateKey);
  }

  private async requestAccessToken(assertion: string): Promise<MeetupAccessTokenResponse> {
    const endpoint = this.options.tokenEndpoint ?? "https://secure.meetup.com/oauth2/access";

    const body = new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    });

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `Meetup JWT bearer token request failed: ${response.status} ${response.statusText} - ${text}`,
      );
    }

    return (await response.json()) as MeetupAccessTokenResponse;
  }
}
```

## 6. RefreshTokenAuthProvider

```ts
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

  constructor(private readonly options: OAuthRefreshTokenAuthProviderOptions) {}

  async getAccessToken(): Promise<string> {
    if (this.cachedToken && this.cachedToken.expiresAt > Date.now() + 60_000) {
      return this.cachedToken.accessToken;
    }

    const refreshToken = await this.options.tokenStore.getRefreshToken();
    const endpoint = this.options.tokenEndpoint ?? "https://secure.meetup.com/oauth2/access";

    const body = new URLSearchParams({
      client_id: this.options.clientKey,
      client_secret: this.options.clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    });

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `Meetup refresh token request failed: ${response.status} ${response.statusText} - ${text}`,
      );
    }

    const tokenResponse = (await response.json()) as MeetupAccessTokenResponse;

    if (tokenResponse.refresh_token) {
      await this.options.tokenStore.saveRefreshToken(tokenResponse.refresh_token);
    }

    this.cachedToken = {
      accessToken: tokenResponse.access_token,
      expiresAt: Date.now() + tokenResponse.expires_in * 1_000,
    };

    return tokenResponse.access_token;
  }
}
```

## 7. Chargement de configuration

Priorité:

1. options CLI;
2. variables d'environnement;
3. fichier `.env`;
4. fichier config local.

Exemple `.env.example`:

```env
MEETUP_AUTH_MODE=jwt-bearer
MEETUP_CLIENT_KEY=
MEETUP_AUTHORIZED_MEMBER_ID=
MEETUP_SIGNING_KEY_ID=
MEETUP_PRIVATE_KEY_PATH=./secrets/meetup-private-key.pem
```

## 8. Sécurité

- Ne jamais afficher la clé privée.
- Ne jamais afficher les tokens.
- Masquer les secrets dans les erreurs.
- Vérifier que `privateKeyPath` existe.
- Refuser de continuer si le fichier clé est world-readable sur Unix, option `--allow-insecure-key-permissions` pour bypass.
- Ne pas stocker de token dans `manifest.json`.

## 9. Commandes liées

```bash
meetup-exit verify-auth
meetup-exit token jwt-bearer
meetup-exit token refresh
```

La commande `token` peut être optionnelle MVP. `verify-auth` suffit si elle sait construire le provider.