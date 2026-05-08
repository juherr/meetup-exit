import { AuthenticationError } from "../errors/index.ts";
import type { MeetupAccessTokenResponse } from "./provider.ts";

export async function requestOAuthToken(
  endpoint: string,
  body: URLSearchParams,
): Promise<MeetupAccessTokenResponse> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new AuthenticationError(
      `OAuth token request failed: ${response.status} ${response.statusText} — ${text}`,
    );
  }

  return (await response.json()) as MeetupAccessTokenResponse;
}
