# Testing Patterns

**Analysis Date:** 2026-05-08

## Test Framework

**Runner:**

- `vitest` (via `vite-plus`)
- Config: Implicit (no standalone vitest.config file; configured through `vite-plus`)
- Configured via `vite.config.ts` which delegates to `vite-plus`

**Assertion Library:**

- `vitest` built-in assertions (expect API)

**Run Commands:**

```bash
vp test                                    # Run all tests
vp test test/auth/access-token.test.ts     # Run single test file
bun run test                                # Alternative via package.json script
vp test --watch                             # Watch mode
vp test --coverage                          # Coverage report (if configured)
```

## Test File Organization

**Location:**

- Co-located with source in parallel `test/` directory structure
- Mirrors `src/` layout exactly: `test/auth/`, `test/archive/`, `test/meetup/`, `test/privacy/`

**Naming:**

- Pattern: `[source-file-name].test.ts`
- Examples: `access-token.test.ts` (tests `src/auth/access-token.ts`), `jsonl-writer.test.ts` (tests `src/archive/jsonl-writer.ts`)

**Structure:**

```
test/
├── auth/
│   ├── access-token.test.ts
│   └── jwt-bearer.test.ts
├── archive/
│   ├── checksums.test.ts
│   ├── jsonl-writer.test.ts
│   ├── manifest.test.ts
│   └── markdown-slug.test.ts
├── meetup/
│   ├── get-event-details.test.ts
│   ├── get-pro-network-probe.test.ts
│   ├── list-event-rsvps.test.ts
│   ├── list-events.test.ts
│   └── list-groups.test.ts
└── privacy/
    ├── filter.test.ts
    ├── hash.test.ts
    └── report.test.ts
```

## Test Structure

**Suite Organization:**

```typescript
// From test/auth/access-token.test.ts
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
```

**Patterns:**

- One `describe()` per exported class or function: `describe("AccessTokenAuthProvider")`
- Multiple `it()` tests per behavior: happy path, edge cases, error cases
- No setup/teardown unless file I/O involved
- Imports always from `vitest` main export: `import { describe, expect, it, vi } from "vitest"`

## Mocking

**Framework:** `vitest`'s `vi` mock object

**Patterns:**

```typescript
// From test/meetup/list-groups.test.ts — mocking client.request
const client = {
  request: vi.fn().mockResolvedValue(makeSearchPage([makeGroup("1"), makeGroup("2")], null, 2)),
  close: vi.fn(),
};
const groups = await listGroups(client as never, "my-network");
expect(client.request).toHaveBeenCalledOnce();

// From test/auth/jwt-bearer.test.ts — stubbing global fetch
vi.stubGlobal("fetch", fetchMock);
await provider.getAccessToken();
expect(fetchMock).toHaveBeenCalledOnce();
vi.unstubAllGlobals();

// Mock return values with mockResolvedValue/mockResolvedValueOnce
const client = {
  request: vi
    .fn()
    .mockResolvedValueOnce(makeSearchPage([makeGroup("1")], "cursor-1"))
    .mockResolvedValueOnce(makeSearchPage([makeGroup("3")], null)),
  close: vi.fn(),
};
```

**What to Mock:**

- GraphQL client requests (via `vi.fn()` mock methods)
- Global fetch for OAuth flows
- File system operations when testing archive writers
- Never mock: crypto, hash functions, JSON parsing (test real implementations)

**What NOT to Mock:**

- Actual crypto operations: use real `jose` library functions
- Hash algorithms: `stableHash()` should compute real hashes in tests
- JSON serialization: always serialize/deserialize for real in tests
- Internal helpers: test them through public API

## Fixtures and Factories

**Test Data:**

```typescript
// From test/archive/jsonl-writer.test.ts
function makeRecord(overrides?: Partial<ArchiveRecord>): ArchiveRecord {
  return {
    source: "meetup",
    exportedAt: "2026-05-08T10:00:00.000Z",
    entityType: "group",
    sourceId: "g-1",
    raw: { id: "g-1", name: "Test Group" },
    ...overrides,
  };
}

// From test/meetup/list-groups.test.ts
function makeGroup(id: string) {
  return { id, name: `Group ${id}`, urlname: `group-${id}`, memberships: { totalCount: 10 } };
}

function makeSearchPage(
  nodes: ReturnType<typeof makeGroup>[],
  endCursor: string | null,
  totalCount = 100,
) {
  return {
    proNetwork: {
      groupsSearch: {
        totalCount,
        pageInfo: { endCursor },
        edges: nodes.map((node) => ({ node })),
      },
    },
  };
}
```

**Location:**

- Defined inside test files, typically at top after imports
- Helper functions named `make*()` or `generate*()`
- Exported if used across multiple test files (none currently are)
- Defaults provided via function parameters, allowing minimal test setup: `makeRecord()` vs `makeRecord({ entityType: "event" })`

## Setup and Teardown

**beforeEach/afterEach usage:**

```typescript
// From test/archive/jsonl-writer.test.ts
describe("JsonlWriter", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "jsonl-writer-test-"));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true });
  });

  it("writes a single record as a valid JSON line", async () => {
    const filePath = join(tmpDir, "output.jsonl");
    // ...
  });
});
```

**When used:**

- Only for file system setup (temporary directories)
- Not used for mocking or state initialization (prefer inline setup)
- Cleanup always in `afterEach()` to avoid test pollution

## Async Testing

**Pattern:**

```typescript
// From test/auth/jwt-bearer.test.ts
it("requests a token with correct JWT claims", async () => {
  const pem = await generateTestKey();
  const { fetchMock } = makeTokenServer();

  vi.stubGlobal("fetch", fetchMock);

  const provider = new OAuthJwtBearerAuthProvider({
    clientKey: "client-key-123",
    // ... required fields
  });

  await provider.getAccessToken();

  expect(fetchMock).toHaveBeenCalledOnce();
  vi.unstubAllGlobals();
});
```

**Conventions:**

- `async` keyword on test function when awaiting Promises
- `await` on all async calls (no unhandled promise rejections)
- Mock setup before async code under test
- Cleanup (like `vi.unstubAllGlobals()`) after assertions

## Error Testing

**Pattern:**

```typescript
// From test/meetup/list-groups.test.ts
it("throws AuthorizationError when proNetwork is null", async () => {
  const client = {
    request: vi.fn().mockResolvedValue({ proNetwork: null }),
    close: vi.fn(),
  };

  await expect(listGroups(client as never, "unknown-network")).rejects.toThrow(AuthorizationError);
});

// From test/meetup/get-event-details.test.ts
it("throws AuthenticationError on HTTP 401", async () => {
  const client = {
    request: vi.fn().mockRejectedValue({ response: { status: 401 } }),
    close: vi.fn(),
  };

  await expect(getEventDetails(client as never, "evt-1")).rejects.toThrow(AuthenticationError);
});
```

**Patterns:**

- Use `expect(...).rejects.toThrow(ErrorClass)` for async errors
- Mock with `.mockRejectedValue()` to test error paths
- Test both specific errors (AuthorizationError) and generic error handling
- Include tests for null/falsy API responses that throw errors

## Test Types

**Unit Tests:**

- Scope: Single function or class method
- Examples: `AccessTokenAuthProvider.getAccessToken()`, `stableHash()`, `applyRsvpPrivacy()`
- Approach: Mock dependencies, test pure logic in isolation
- Files: `test/auth/*.test.ts`, `test/privacy/*.test.ts`

**Integration Tests:**

- Scope: Multiple modules working together
- Examples: `MeetupGraphqlClient` with retries, pagination in `listGroups()`
- Approach: Mock external APIs (GraphQL endpoint), test orchestration logic
- Files: `test/meetup/*.test.ts` (mock graphql-request client calls)

**Fixtures and File I/O Tests:**

- Scope: Archive writers, checksums, manifest generation
- Examples: `JsonlWriter`, `writeChecksums()`
- Approach: Create real temporary files, verify output, clean up
- Files: `test/archive/*.test.ts`

**E2E Tests:**

- Status: Not used in this codebase
- Justification: CLI testing would require real Meetup API credentials; MVP phase (see CLAUDE.md)

## Coverage

**Requirements:**

- No explicit coverage target enforced (no pre-commit hook)
- No coverage exclusions configured

**View Coverage:**

```bash
vp test --coverage
```

**Current coverage status:**

- Core modules well covered: auth, privacy filters, archive writers, query functions
- CLI commands not tested (would require integration setup)
- Export orchestrator partially tested (mocked client calls)

## Coverage Gaps

**Not covered:**

- `src/cli/commands/*` — CLI commands (require environment setup)
- `src/export/orchestrator.ts` — Full export flow (would be integration-level)
- Error boundary cases in `requestOAuthToken()` (HTTP error paths partially tested)
- GraphQL query generation (generated code, tested implicitly)

## Test Utilities

**Helper utilities:**

- None in a dedicated `test/helpers/` directory
- Helpers live inline in test files (factories like `makeRecord()`, `makeGroup()`)
- Crypto utilities for test setup: `generateTestKey()` in `test/auth/jwt-bearer.test.ts`
- Temporary directory helpers: `mkdtemp()`, `tmpdir()` from Node.js built-in modules

**Example helper from `test/auth/jwt-bearer.test.ts`:**

```typescript
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
```

## Testing Best Practices Observed

**Naming clarity:**

- Test descriptions are clear: "returns the provided token", "reuses cached token within expiry window"
- Describe blocks use class/function names: `describe("AccessTokenAuthProvider")`

**Minimal setup:**

- Factories with defaults reduce boilerplate
- Inline mocks over shared mock factories
- No global before/after blocks (only used for file cleanup)

**Assertion specificity:**

- Tests check specific fields: `expect(result.memberId).toMatch(/^member_[0-9a-f]{12}$/)`
- Multiple assertions per test when related: testing both stable hashing and PII replacement
- Verify mock calls and return values: `expect(client.request).toHaveBeenCalledOnce()` + `expect(groups[0]).toMatchObject(...)`

**Test data validity:**

- Fixtures match real API shapes: `makeSearchPage()` returns exact GraphQL response structure
- Edge cases covered: null values, empty arrays, pagination cursors, missing fields

---

_Testing analysis: 2026-05-08_