# Architecture

**Analysis Date:** 2026-05-08

## Pattern Overview

**Overall:** Modular layered architecture with strict module boundaries. Six independent modules communicate through well-defined interfaces, with the CLI orchestration layer calling core modules while core modules never call CLI.

**Key Characteristics:**
- No cross-boundary module leakage (auth does not touch filesystem; archive has no API knowledge)
- Dependency flow: CLI → Export → (Meetup + Archive + Privacy) → (Auth + Logging + Errors)
- Plug-in auth providers (AccessToken, OAuthJwtBearer, OAuthRefreshToken)
- Rate-limited GraphQL client with automatic retry on RATE_LIMITED errors
- Privacy modes applied at export time, not at API fetch time

## Layers

**CLI Layer:**
- Purpose: Command-line interface, argument parsing, environment variable loading, human-readable output, exit codes
- Location: `src/cli/`
- Contains: Commander commands, auth option builders, error handling and exit code routing
- Depends on: auth, export, meetup, logging, errors
- Used by: User via CLI invocation

**Export Orchestration Layer:**
- Purpose: Coordinate data fetching, filtering, de-duplication, privacy application, and archive writing
- Location: `src/export/orchestrator.ts`
- Contains: `runExport()` function that manages the entire export workflow
- Depends on: meetup (GraphQL functions), archive (writers), privacy (filters), auth, logging, errors
- Used by: CLI export command

**Meetup API Layer:**
- Purpose: GraphQL client with Bottleneck rate limiting, automatic retry, and typed query functions
- Location: `src/meetup/`
- Contains: `MeetupGraphqlClient` (rate limiting + retry logic), typed query functions (getSelf, listGroups, listEvents, etc.)
- Depends on: auth (for access tokens), errors
- Used by: Export orchestrator, CLI verify-auth/probe-network commands

**Archive Writing Layer:**
- Purpose: File I/O for JSONL, CSV, Markdown, manifest, and checksums
- Location: `src/archive/`
- Contains: JsonlWriter (append-only line protocol), CSV formatters per entity type, Markdown event files, manifest/checksum generation
- Depends on: Node.js fs/path modules
- Used by: Export orchestrator

**Privacy Layer:**
- Purpose: Email filtering, pseudonymization with stable hashing, PII classification, GDPR report generation
- Location: `src/privacy/`
- Contains: Privacy mode enum (full, no-email, pseudonymized, public-archive), privacy filter functions, stable hash generation, GDPR report writer
- Depends on: None (pure functions and built-in crypto)
- Used by: Export orchestrator

**Auth Layer:**
- Purpose: Pluggable authentication providers (AccessToken, OAuthJwtBearer, OAuthRefreshToken)
- Location: `src/auth/`
- Contains: MeetupAuthProvider interface, three provider implementations, JWT signing logic
- Depends on: jose (JWT/JWS), errors
- Used by: MeetupGraphqlClient, CLI auth option builder

**Cross-Cutting Layers:**
- Logging: `src/logging/` — simple console logger with optional JSON mode
- Errors: `src/errors/` — custom error types (AuthenticationError, AuthorizationError, RateLimitedError, GraphqlValidationError, GraphqlExecutionError)

## Data Flow

**Authentication Flow (JWT Bearer Mode):**

1. CLI parses `--client-key`, `--member-id`, `--signing-key-id`, `--private-key` flags
2. `buildAuthProvider()` in `src/cli/shared/auth-options.ts` instantiates `OAuthJwtBearerAuthProvider`
3. Provider reads private key from file path
4. On API call, `MeetupGraphqlClient.request()` calls `authProvider.getAccessToken()`
5. Provider creates RS256 JWT with claims: sub=memberId, iss=clientKey, aud=api.meetup.com, exp=120s
6. Provider POSTs JWT to `https://secure.meetup.com/oauth2/access` and caches token with 60s safety margin
7. Token returned to client, used in Authorization header: `Bearer <token>`

**Export Flow (High-Level):**

1. CLI `export` command collects flags and builds ExportOptions
2. CLI instantiates `MeetupGraphqlClient` with auth provider
3. CLI calls `runExport()` with client, options, and logger
4. Orchestrator creates directory structure `exports/meetup-YYYY-MM-DD/`
5. For each entity type (groups → events → rsvps → registration-answers):
   - Call Meetup GraphQL function with pagination
   - On each result, write ArchiveRecord to JSONL (append-only)
   - Convert entity to CSV row, collect row
   - For events, generate Markdown file if flag set
   - Apply privacy filters when writing CSV/Markdown
6. Write manifest.json with metadata and metrics
7. Write checksums/sha256.txt for integrity verification

**Rate Limiting & Retry:**

1. Bottleneck limiter configured with 450 req/min reservoir (safety margin below 500-point limit)
2. Query cost weights defined: self=1, groupsPage=5, eventsPage=5, eventDetails=10, eventRsvpsPage=15, registrationAnswersPage=15
3. On RATE_LIMITED GraphQL error, extract resetAt timestamp
4. Sleep until resetAt, then retry (max 4 attempts per request)
5. If still rate limited on 4th attempt, throw error and stop export

**Privacy Application:**

1. Four privacy modes:
   - `full`: All data exported, archive is private
   - `no-email`: Emails stripped from CSV/Markdown, raw archive may remain full
   - `pseudonymized`: Member IDs/emails replaced with stable hashes (salt-based for determinism)
   - `public-archive`: Only events/dates/descriptions/hosts/photos; no RSVPs, emails, or form answers
2. Filters applied when writing CSV/Markdown, not when fetching from API
3. Stable hash uses HMAC-SHA256(salt, memberId) for deterministic pseudonymization

## Key Abstractions

**MeetupAuthProvider:**
- Purpose: Pluggable interface for different OAuth/token strategies
- Examples: `src/auth/access-token.ts`, `src/auth/jwt-bearer.ts`, `src/auth/refresh-token.ts`
- Pattern: Interface with single `getAccessToken(): Promise<string>` method

**ArchiveRecord:**
- Purpose: Normalized envelope for all exported entities
- Pattern: `{ source: "meetup", exportedAt, entityType, sourceId, parentIds?, raw }` written as JSONL
- Example in `src/archive/types.ts`

**MeetupGraphqlClient:**
- Purpose: Bottleneck + retry wrapper around graphql-request
- Pattern: Schedule requests through limiter, extract rate limit errors, sleep and retry
- Location: `src/meetup/client.ts`

**Query Functions (getSelf, listGroups, listEvents, etc.):**
- Purpose: Typed GraphQL query wrappers
- Pattern: gql tag + RequestDocument type → error handling with throwMeetupRequestError()
- Location: `src/meetup/functions/`

**CSV Writers (writeGroupsCsv, writeEventsCsv, etc.):**
- Purpose: Entity-specific row type + transformation to string[][] + csv-stringify
- Pattern: Each has own type (GroupCsvRow, EventCsvRow, etc.) and writeXxxCsv() function
- Location: `src/archive/csv/`

## Entry Points

**CLI Main:**
- Location: `src/cli/main.ts`
- Triggers: User runs `bun src/cli/main.ts` or `meetup-exit` (built binary)
- Responsibilities: Parse program, add commands, parse process.argv

**Export Command:**
- Location: `src/cli/commands/export.ts`
- Triggers: User runs `meetup-exit export --network <name> --out <dir>`
- Responsibilities: Parse export flags, build auth provider, instantiate MeetupGraphqlClient, call runExport()

**Verify-Auth Command:**
- Location: `src/cli/commands/verify-auth.ts`
- Triggers: User runs `meetup-exit verify-auth`
- Responsibilities: Test auth by calling getSelf(), display identity, exit 2 on auth failure

**Probe-Network Command:**
- Location: `src/cli/commands/probe-network.ts`
- Triggers: User runs `meetup-exit probe-network --network <urlname>`
- Responsibilities: Confirm Pro network access, exit 3 on failure

**Introspect Command:**
- Location: `src/cli/commands/introspect.ts`
- Triggers: User runs `meetup-exit introspect --out <file>`
- Responsibilities: Dump GraphQL schema to JSON file for code generation

## Error Handling

**Strategy:** 
- API errors (401/403) convert to AuthenticationError and propagate to CLI
- Auth errors cause immediate exit with code 2
- Other errors logged and continue (except on auth failure or first entity failure)
- Rate limit errors caught by Bottleneck limiter, automatic retry with exponential backoff

**Patterns:**
- `throwMeetupRequestError(error)` checks HTTP status, converts 401/403 to AuthenticationError
- `extractMeetupRateLimitResetAt(error)` extracts resetAt from GraphQL extensions
- CLI catches AuthenticationError and AuthorizationError separately, exits 2 and 3 respectively
- Export error tracking: one entity failure logs + continues; auth failure stops immediately
- Catch blocks in CLI use `error instanceof AuthenticationError` pattern for type-safe branching

## Cross-Cutting Concerns

**Logging:** 
- `src/logging/index.ts` provides simple Logger interface: `info(msg)`, `warn(msg)`, `error(msg)`
- Factory: `createLogger(jsonMode: boolean)` — returns console-based logger with `[meetup-exit]` prefix or JSON structured format
- Used by: CLI, export orchestrator

**Validation:** 
- CLI validates all environment variables via `zod` (in buildAuthProvider, parsed in commands)
- Private key file existence validated before auth provider instantiation
- No validation of GraphQL responses; trust Meetup API schema

**Authentication:** 
- All three auth modes set Authorization header: `Bearer <accessToken>`
- Token never logged; errors mask token values
- JWT Bearer mode requires file I/O for private key (permission errors surface immediately)
- Refresh token mode: single-use tokens, must persist after every refresh

**Configuration:** 
- CLI flags override env vars override `.env` file override defaults
- All env var keys prefixed with `MEETUP_*`
- Private key loaded from file path in `--private-key` or `MEETUP_PRIVATE_KEY_PATH`
- Export options: include/exclude flags, page size, privacy mode, event status filter, output directory

---

*Architecture analysis: 2026-05-08*
