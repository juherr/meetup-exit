import { describe, expect, it } from "vitest";
import { AccessTokenAuthProvider } from "../../src/auth/access-token.ts";

describe("AccessTokenAuthProvider", () => {
  it("returns the provided token", async () => {
    const provider = new AccessTokenAuthProvider("test-token-abc");
    expect(await provider.getAccessToken()).toBe("test-token-abc");
  });

  it("returns the same token on repeated calls", async () => {
    const provider = new AccessTokenAuthProvider("my-token");
    expect(await provider.getAccessToken()).toBe(await provider.getAccessToken());
  });
});
