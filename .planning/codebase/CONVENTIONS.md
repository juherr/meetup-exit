# Coding Conventions

**Analysis Date:** 2026-05-08

## Naming Patterns

**Files:**
- Kebab-case for all source files: `jwt-bearer.ts`, `list-groups.ts`, `write-csv.ts`
- Test files match source file names with `.test.ts` suffix: `access-token.test.ts`, `jsonl-writer.test.ts`
- Directories use kebab-case: `cli/commands/`, `archive/csv/`, `privacy/`

**Functions:**
- camelCase for all functions: `getAccessToken()`, `requestOAuthToken()`, `stableHash()`, `applyRsvpPrivacy()`
- Prefix with action verb: `get*`, `list*`, `write*`, `request*`, `apply*`, `extract*`, `throw*`
- Private methods use `private` modifier, prefixed with optional underscore: `private fetchNewToken()`, `private ensureOpen()`

**Variables:**
- camelCase for all variable names: `endCursor`, `seenCursors`, `inflightRequest`, `cachedToken`, `defaultRateLimitConfig`
- Boolean variables often prefixed with `is` or use past tense: `isOpen`, `cached*`, `effective*`
- Constants use UPPERCASE_SNAKE_CASE: `PRIVACY_MODES`, `AUTH_MODES`, `PSEUDONYM_PREFIXES`, `MeetupQueryCost`
- Single/short lived: `e` for event handlers, `fs` for file streams, `i` for loop counters (rarely used)

**Types:**
- PascalCase for all types: `MeetupAuthProvider`, `OAuthJwtBearerAuthProvider`, `AuthenticationError`, `PrivacyMode`
- Suffix with `Error` for error types: `AuthenticationError`, `AuthorizationError`, `RateLimitedError`, `GraphqlValidationError`
- Suffix with `Options` for configuration objects: `OAuthJwtBearerAuthProviderOptions`, `ExportOptions`
- Suffix with `Response` for API response types: `MeetupAccessTokenResponse`, `GetEventDetailsResponse`, `ListGroupsResponse`
- Suffix with `Target` for data structures being transformed: `RsvpPrivacyTarget`, `AttendeePrivacyTarget`

## Code Style

**Formatting:**
- Configured via `vite-plus` (Vite+ toolchain mentioned in CLAUDE.md)
- Uses `oxfmt` for automatic formatting
- Run `vp check --fix` to auto-format code
- 2-space indentation (TypeScript/ESNext standard)
- No trailing commas in single-line arrays/objects; trailing commas in multiline

**Linting:**
- Uses `oxlint` (Rust-based linter, part of Vite+)
- Run `vp check` to lint without auto-fix
- No configuration file present; uses oxlint defaults
- Strict TypeScript: `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`

## Import Organization

**Order:**
1. Node.js built-in modules: `import { mkdir } from "node:fs/promises"`
2. External packages: `import { SignJWT } from "jose"`, `import { GraphQLClient } from "graphql-request"`
3. Local types (type-only imports first): `import type { MeetupAuthProvider } from "../auth/provider.ts"`
4. Local code imports: `import { AuthenticationError } from "../errors/index.ts"`

**Path Aliases:**
- No path aliases configured (relative imports used throughout)
- All relative imports include `.ts` extension: `import { getSelf } from "../../meetup/functions/get-self.ts"`
- Prefer explicit imports over barrel files, though barrel exports are used (e.g., `src/privacy/index.ts`, `src/archive/markdown/index.ts`)

**Type-only imports:**
- Always use `import type` for types-only: `import type { MeetupAuthProvider } from "../auth/provider.ts"`
- Separate from value imports: Types come after regular imports

## Error Handling

**Patterns:**
- Domain-specific error classes extend Error: `class AuthenticationError extends Error { readonly code = "AuthenticationError" }`
- Every custom error includes a `name` and `code` property for identification
- Error-specific handling in try-catch blocks: `if (error instanceof AuthenticationError) throw error`
- For external API errors, use `throwMeetupRequestError(error)` to translate HTTP status codes to domain errors
- Catch errors as `unknown` when not immediately handled, then narrow type: `catch (error) { const status = (error as { response?: { status?: number } }).response?.status }`
- Re-throw known errors without wrapping; new errors for new conditions

**Examples from codebase:**
```typescript
// From src/meetup/client.ts
export function throwMeetupRequestError(error: unknown): never {
  const status = (error as { response?: { status?: number } }).response?.status;
  if (status === 401 || status === 403) {
    throw new AuthenticationError("Invalid or expired access token");
  }
  throw error;
}

// From src/meetup/functions/get-event-details.ts
try {
  const data = await client.request<GetEventDetailsResponse>(
    GET_EVENT_DETAILS,
    { eventId },
    { estimatedCost: MeetupQueryCost.eventDetails },
  );
  if (data.event === null) {
    throw new AuthorizationError(`Event "${eventId}" not found or access denied`);
  }
  return data.event;
} catch (error) {
  if (error instanceof AuthorizationError) throw error;
  throwMeetupRequestError(error);
}
```

## Logging

**Framework:** Custom logger abstraction (not Winston, Bunyan, or Pino)

**Patterns:**
- Logger is injected as dependency: `export async function runExport(..., logger: Logger)`
- Methods: `.info(msg: string)`, `.warn(msg: string)`, `.error(msg: string)`
- Created via factory: `createLogger(jsonMode: boolean)` in `src/logging/index.ts`
- JSON mode outputs structured logs; text mode prefixes with `[meetup-exit]`
- Log messages are plain strings, not formatted; no parameterized logging
- **Never log credentials, tokens, or private keys** (implicitly enforced by architecture)

**Implementation from `src/logging/index.ts`:**
```typescript
export function createLogger(jsonMode: boolean): Logger {
  if (jsonMode) {
    return {
      info: (msg) =>
        console.log(JSON.stringify({ level: "info", msg, ts: new Date().toISOString() })),
      warn: (msg) =>
        console.warn(JSON.stringify({ level: "warn", msg, ts: new Date().toISOString() })),
      error: (msg) =>
        console.error(JSON.stringify({ level: "error", msg, ts: new Date().toISOString() })),
    };
  }
  return {
    info: (msg) => console.log(`[meetup-exit] ${msg}`),
    warn: (msg) => console.warn(`[meetup-exit] ${msg}`),
    error: (msg) => console.error(`[meetup-exit] ${msg}`),
  };
}
```

## Comments

**When to Comment:**
- Comments explain *why*, not what (code is clear; intent may not be)
- Inline comments rare; only for non-obvious algorithms or workarounds
- Comments kept short and plain English
- No block comments above functions; logic should be clear from types and names

**Examples from codebase:**
```typescript
// From src/meetup/client.ts
// Keep a safety margin below Meetup's documented 500-point rate limit.
const defaultRateLimitConfig: MeetupRateLimitConfig = {
  reservoir: 450,
  // ...
};

// From src/meetup/client.ts (in retry logic)
// Deduplicate concurrent token requests.
if (this.inflightRequest === null) {
  this.inflightRequest = this.fetchNewToken().finally(() => {
    this.inflightRequest = null;
  });
}
```

**JSDoc/TSDoc:**
- Not used; rely on type signatures and descriptive names instead
- Return types inferred from implementation
- No `@param` or `@returns` tags

## Function Design

**Size:**
- Functions are concise: median 10-30 lines
- Single responsibility principle: one function = one task
- Heavy lifting delegated to helpers: `extractMeetupRateLimitResetAt()`, `stableHash()`

**Parameters:**
- Use typed options objects rather than many positional parameters: `options?: { pageSize?: number }`
- Optional parameters via object destructuring or `?.` chaining
- Overloaded signatures avoided; generic parameters used for type flexibility

**Return Values:**
- Explicit types on all function signatures: `async function listGroups(...): Promise<Group[]>`
- Nullable returns via union with null: `featuredEventPhoto: { id: string; baseUrl: string } | null`
- No implicit undefined; explicit null for "no value"

**Example from `src/meetup/functions/list-groups.ts`:**
```typescript
export async function listGroups(
  client: MeetupGraphqlClient,
  networkUrlname: string,
  options?: { pageSize?: number },
): Promise<Group[]> {
  const pageSize = options?.pageSize ?? 100;
  const groups: Group[] = [];
  let cursor: string | undefined;
  // ...
  return groups;
}
```

## Module Design

**Exports:**
- Barrel files aggregate related exports: `src/privacy/index.ts` exports all privacy utilities
- Barrel files re-export both values and types: `export { stableHash } from "./hash.ts"` and `export type { PrivacyMode } from "./modes.ts"`
- Modules typically export one main type and one main function: `MeetupGraphqlClient` + `.request()` from `src/meetup/client.ts`
- Utility functions exported as-is, not wrapped

**Barrel Files:**
- Used for module boundaries: `src/auth/index.ts` (implicitly imports from submodules via namespace), `src/privacy/index.ts`, `src/archive/markdown/index.ts`
- Simplify imports: import from `../../privacy/index.ts` or `../../privacy/` (both work)
- Typically one barrel file per module directory

## TypeScript Strictness

**Configuration from `tsconfig.json`:**
- `strict: true` — all strict checks enabled
- `noUncheckedIndexedAccess: true` — array/object indexing requires existence checks
- `exactOptionalPropertyTypes: true` — optional properties cannot be undefined (must be omitted or use null)
- `noFallthroughCasesInSwitch: true` — switch cases must return or break
- `noImplicitOverride: true` — overriding methods must use `override` keyword

**Impact on conventions:**
- No `any` except at error boundaries: `catch (error: unknown)` then narrow type
- Null coalescing (`??`) preferred over OR (`||`) for defaults
- Explicit type assertions only at external boundaries: `(error as { response?: { status?: number } })`
- Optional chaining (`?.`) used liberally: `search.pageInfo.endCursor`, `data.proNetwork?.groupsSearch`

---

*Convention analysis: 2026-05-08*
