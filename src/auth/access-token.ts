import type { MeetupAuthProvider } from "./provider.ts";

export class AccessTokenAuthProvider implements MeetupAuthProvider {
  constructor(private readonly accessToken: string) {}

  async getAccessToken(): Promise<string> {
    return this.accessToken;
  }
}
