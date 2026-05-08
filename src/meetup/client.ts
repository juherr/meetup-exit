import Bottleneck from "bottleneck";
import { GraphQLClient, type RequestDocument, type Variables } from "graphql-request";
import type { MeetupAuthProvider } from "../auth/provider.ts";
import { AuthenticationError } from "../errors/index.ts";

export type MeetupRateLimitConfig = {
  reservoir: number;
  reservoirRefreshAmount: number;
  reservoirRefreshIntervalMs: number;
  maxConcurrent: number;
  minTimeMs: number;
};

// Keep a safety margin below Meetup's documented 500-point rate limit.
const defaultRateLimitConfig: MeetupRateLimitConfig = {
  reservoir: 450,
  reservoirRefreshAmount: 450,
  reservoirRefreshIntervalMs: 60_000,
  maxConcurrent: 2,
  minTimeMs: 250,
};

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
  return resetAt !== undefined ? new Date(resetAt) : null;
}

function sleep(delayMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

export function throwMeetupRequestError(error: unknown): never {
  const status = (error as { response?: { status?: number } }).response?.status;
  if (status === 401 || status === 403) {
    throw new AuthenticationError("Invalid or expired access token");
  }
  throw error;
}

export class MeetupGraphqlClient {
  private readonly limiter: Bottleneck;

  constructor(
    private readonly options: {
      endpoint: string;
      authProvider: MeetupAuthProvider;
      rateLimit?: Partial<MeetupRateLimitConfig>;
    },
  ) {
    const config = { ...defaultRateLimitConfig, ...options.rateLimit };

    this.limiter = new Bottleneck({
      reservoir: config.reservoir,
      reservoirRefreshAmount: config.reservoirRefreshAmount,
      reservoirRefreshInterval: config.reservoirRefreshIntervalMs,
      maxConcurrent: config.maxConcurrent,
      minTime: config.minTimeMs,
    });
  }

  close(): Promise<void> {
    return this.limiter.stop({ dropWaitingJobs: false });
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
          headers: { authorization: `Bearer ${accessToken}` },
        });

        return await client.request<TResponse, TVariables>(document, variables);
      } catch (error) {
        const resetAt = extractMeetupRateLimitResetAt(error);

        if (resetAt === null || attempt === maxAttempts) {
          throw error;
        }

        const delayMs = Math.max(resetAt.getTime() - Date.now(), 1_000);
        await sleep(delayMs);
      }
    }

    throw new Error("Unexpected retry loop exit");
  }
}
