import { generateKeyPair, exportPKCS8, decodeJwt, decodeProtectedHeader } from "jose";
import { describe, expect, it, vi } from "vitest";
import { OAuthJwtBearerAuthProvider } from "../../src/auth/jwt-bearer.ts";

async function generateTestKey(): Promise<string> {
  const { privateKey } = await generateKeyPair("RS256", { extractable: true });
  return exportPKCS8(privateKey);
}

function makeTokenServer() {
  let callCount = 0;

  const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => {
    callCount++;
    return new Response(
      JSON.stringify({
        access_token: `token-${callCount}`,
        token_type: "bearer",
        expires_in: 3600,
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  });

  return { fetchMock, getCallCount: () => callCount };
}

describe("OAuthJwtBearerAuthProvider", () => {
  it("requests a token with correct JWT claims", async () => {
    const pem = await generateTestKey();
    const { fetchMock } = makeTokenServer();

    vi.stubGlobal("fetch", fetchMock);

    const provider = new OAuthJwtBearerAuthProvider({
      clientKey: "client-key-123",
      authorizedMemberId: "member-456",
      signingKeyId: "key-789",
      privateKeyPem: pem,
      tokenEndpoint: "https://example.com/oauth2/access",
    });

    await provider.getAccessToken();

    expect(fetchMock).toHaveBeenCalledOnce();

    const [, init] = fetchMock.mock.calls[0]!;
    const body = new URLSearchParams(init!.body as string);
    const assertion =
      body.get("grant_type") === "urn:ietf:params:oauth:grant-type:jwt-bearer"
        ? body.get("assertion")!
        : null;

    expect(body.get("grant_type")).toBe("urn:ietf:params:oauth:grant-type:jwt-bearer");
    expect(assertion).toBeTruthy();

    const claims = decodeJwt(assertion!);
    expect(claims.iss).toBe("client-key-123");
    expect(claims.sub).toBe("member-456");
    expect(claims.aud).toBe("api.meetup.com");
    expect(claims.exp).toBeDefined();

    const header = decodeProtectedHeader(assertion!);
    expect(header.alg).toBe("RS256");
    expect(header.kid).toBe("key-789");
    expect(header.typ).toBe("JWT");

    vi.unstubAllGlobals();
  });

  it("reuses cached token within expiry window", async () => {
    const pem = await generateTestKey();
    const { fetchMock, getCallCount } = makeTokenServer();

    vi.stubGlobal("fetch", fetchMock);

    const provider = new OAuthJwtBearerAuthProvider({
      clientKey: "client-key",
      authorizedMemberId: "member-id",
      signingKeyId: "key-id",
      privateKeyPem: pem,
      tokenEndpoint: "https://example.com/oauth2/access",
    });

    const token1 = await provider.getAccessToken();
    const token2 = await provider.getAccessToken();

    expect(token1).toBe(token2);
    expect(getCallCount()).toBe(1);

    vi.unstubAllGlobals();
  });
});
