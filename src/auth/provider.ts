export type MeetupAuthProvider = {
  getAccessToken(): Promise<string>;
};

export const AUTH_MODES = ["access-token", "jwt-bearer", "refresh-token"] as const;
export type AuthMode = (typeof AUTH_MODES)[number];

export type MeetupAccessTokenResponse = {
  access_token: string;
  token_type: "bearer" | string;
  expires_in: number;
  refresh_token?: string;
};
