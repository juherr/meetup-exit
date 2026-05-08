# 05 — Rate limit, retry et résilience

## 1. Contexte

Meetup GraphQL documente une erreur de rate limit:

```json
{
  "extensions": {
    "code": "RATE_LIMITED",
    "consumedPoints": 500,
    "resetAt": "2021-12-12T18:37:51.644Z"
  }
}
```

Il faut donc limiter le débit et gérer un retry basé sur `resetAt`.

## 2. Librairie

Utiliser `bottleneck`.

Motifs:

- limite concurrence;
- limite débit;
- supporte un reservoir;
- permet de pondérer les jobs;
- fiable pour des exports batch.

## 3. Configuration par défaut

```ts
export type MeetupRateLimitConfig = {
  reservoir: number;
  reservoirRefreshAmount: number;
  reservoirRefreshIntervalMs: number;
  maxConcurrent: number;
  minTimeMs: number;
};

export const defaultMeetupRateLimitConfig: MeetupRateLimitConfig = {
  reservoir: 450,
  reservoirRefreshAmount: 450,
  reservoirRefreshIntervalMs: 60_000,
  maxConcurrent: 2,
  minTimeMs: 250,
};
```

On garde une marge sous 500, car Meetup parle de points, pas simplement de nombre d'appels.

## 4. Coûts estimés

```ts
export const MeetupQueryCost = {
  self: 1,
  proNetworkProbe: 2,
  groupsPage: 5,
  eventsPage: 5,
  eventDetails: 10,
  eventRsvpsPage: 15,
  registrationAnswersPage: 15,
  introspection: 100,
} as const;
```

Ces coûts sont conservateurs. Ils doivent pouvoir être surchargés par config.

## 5. Client avec Bottleneck

```ts
import Bottleneck from "bottleneck";
import { GraphQLClient, RequestDocument, Variables } from "graphql-request";

export class MeetupGraphqlClient {
  private readonly limiter: Bottleneck;

  constructor(
    private readonly options: {
      endpoint: string;
      authProvider: MeetupAuthProvider;
      rateLimit?: Partial<MeetupRateLimitConfig>;
    },
  ) {
    const config = { ...defaultMeetupRateLimitConfig, ...options.rateLimit };

    this.limiter = new Bottleneck({
      reservoir: config.reservoir,
      reservoirRefreshAmount: config.reservoirRefreshAmount,
      reservoirRefreshInterval: config.reservoirRefreshIntervalMs,
      maxConcurrent: config.maxConcurrent,
      minTime: config.minTimeMs,
    });
  }

  async request<TResponse, TVariables extends Variables = Variables>(
    document: RequestDocument,
    variables?: TVariables,
    options?: { estimatedCost?: number },
  ): Promise<TResponse> {
    return this.limiter.schedule({ weight: options?.estimatedCost ?? 1 }, () =>
      this.requestWithRetry<TResponse, TVariables>(document, variables),
    );
  }

  private async requestWithRetry<TResponse, TVariables extends Variables>(
    document: RequestDocument,
    variables?: TVariables,
  ): Promise<TResponse> {
    const maxAttempts = 4;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const accessToken = await this.options.authProvider.getAccessToken();

        const client = new GraphQLClient(this.options.endpoint, {
          headers: {
            authorization: `Bearer ${accessToken}`,
          },
        });

        return await client.request<TResponse, TVariables>(document, variables);
      } catch (error) {
        const resetAt = extractMeetupRateLimitResetAt(error);

        if (!resetAt || attempt === maxAttempts) {
          throw error;
        }

        const delayMs = Math.max(resetAt.getTime() - Date.now(), 1_000);
        await sleep(delayMs);
      }
    }

    throw new Error("Unexpected retry loop exit");
  }
}
```

## 6. Extraction rate limit

```ts
export function extractMeetupRateLimitResetAt(error: unknown): Date | null {
  const maybeError = error as {
    response?: {
      errors?: Array<{
        extensions?: {
          code?: string;
          resetAt?: string;
        };
      }>;
    };
  };

  const rateLimitError = maybeError.response?.errors?.find(
    (item) => item.extensions?.code === "RATE_LIMITED",
  );

  const resetAt = rateLimitError?.extensions?.resetAt;

  return resetAt ? new Date(resetAt) : null;
}

export function sleep(delayMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}
```

## 7. Stratégie d'échec

- `RATE_LIMITED`: attendre `resetAt`, puis retry.
- `5xx`: retry exponential backoff avec jitter.
- `401/403`: pas de retry sauf si refresh token provider peut renouveler.
- GraphQL validation error: pas de retry.
- Error sur une entité: logguer et continuer si possible.

## 8. CLI options

```bash
--max-concurrent 2
--min-time-ms 250
--rate-reservoir 450
--rate-refresh-ms 60000
--max-retries 3
```

## 9. Observabilité

Le manifest doit contenir:

- nombre de requêtes;
- nombre de retries;
- nombre de rate limits;
- temps total;
- erreurs par stage.

Exemple:

```json
{
  "metrics": {
    "graphqlRequests": 831,
    "rateLimitedRetries": 2,
    "httpRetries": 1,
    "durationSeconds": 512
  }
}
```