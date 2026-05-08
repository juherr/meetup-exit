# Codebase Concerns

**Analysis Date:** 2026-05-08

## Tech Debt

**Missing Resume/Deduplication System:**

- Issue: No resume functionality prevents efficient re-exports. Crashes mid-export require full re-fetching from API, wasting quota and time.
- Files: `src/export/orchestrator.ts` (entire export flow), `src/meetup/functions/*.ts`
- Impact: Long-running exports are fragile; any interruption wastes significant API resources and requires re-running
- Fix approach: Implement `.meetup-exit/index.json` resume index (keyed by `entityType`, `sourceId`, `parentIds`) to skip already-exported records. Track progress per entity type and allow resuming from checkpoint.

**Unimplemented Convert Command:**

- Issue: `convert` command mentioned in roadmap (specs/09-backlog.md §8) but not implemented
- Files: CLI command registry in `src/cli/main.ts` missing `convertCommand` import
- Impact: Cannot re-derive CSV/Markdown from existing raw JSONL without re-exporting from API
- Fix approach: Implement `src/cli/commands/convert.ts` to read raw JSONL files and regenerate archive formats with configurable privacy mode

**Incomplete Metrics in Manifest:**

- Issue: Manifest stores placeholder metrics (all zeros): `graphqlRequests: 0`, `rateLimitedRetries: 0`
- Files: `src/archive/manifest.ts` (type definition), `src/export/orchestrator.ts` (line 362)
- Impact: Export reports lack visibility into API usage and performance
- Fix approach: Thread rate limit stats through `MeetupGraphqlClient` → orchestrator; count actual requests and retries

**Missing Error Records Module:**

- Issue: Individual entity fetch failures are logged but not persisted to `raw/errors.jsonl` or `reports/errors.md`
- Files: `src/export/orchestrator.ts` (lines 214-221, 269-276, 307-314 catch blocks)
- Impact: Failed entities disappear from logs after export completes; no record for audit or retry
- Fix approach: Implement error writer alongside JSONL writers; track failure reason, entity details, and timestamp; generate errors.md report

**Doctor Command Stub:**

- Issue: `doctor` command planned (specs/07-cli-spec.md) but not implemented
- Files: CLI command registry in `src/cli/main.ts`
- Impact: Users have no built-in way to diagnose env/config issues before export
- Fix approach: Implement `src/cli/commands/doctor.ts` to validate Node version, check env vars, verify key file permissions, test output directory writability

## Known Bugs

**Pseudonymization Salt Reproducibility Risk:**

- Symptoms: When `--privacy-mode pseudonymized` is used without explicit `--pseudonymization-salt`, a random salt is generated (line 80 in `src/export/orchestrator.ts`). If user forgets to save the salt, subsequent exports produce different hashes for same entities.
- Files: `src/export/orchestrator.ts` (lines 78-85), `src/privacy/filter.ts` (salt applied at lines 35-44, 57-66)
- Trigger: `bun src/cli/main.ts export --network mynet --out exports/ --privacy-mode pseudonymized` without `--pseudonymization-salt`
- Workaround: Capture the salt from log warning and reuse it in future exports. Document this strongly.
- Root cause: No persistent salt storage between runs; salt only logged to stdout

## Security Considerations

**Pseudonymization Hash Collision Risk:**

- Risk: Stable hash truncated to 12 hex characters (48 bits). With millions of members, birthday paradox increases collision risk.
- Files: `src/privacy/hash.ts` (line 4: `.slice(0, 12)`)
- Current mitigation: Low-frequency use case (individual exports, not continuous); salted hash reduces rainbow table attacks
- Recommendations: Consider 16+ characters (64 bits) for future scalability; document limitation in GDPR report if using pseudonymization at scale

**Raw Token Handling in OAuth Bearer Flow:**

- Risk: Access tokens cached in memory without rotation. If process memory is dumped, tokens are exposed.
- Files: `src/auth/jwt-bearer.ts` (line 15), `src/auth/refresh-token.ts` (line 17)
- Current mitigation: Cache expires after 60s safety margin; bearer tokens are short-lived (typically 1 hour)
- Recommendations: Clear cached tokens on auth error; add explicit token revocation on export completion

**Private Key in .env File:**

- Risk: `MEETUP_PRIVATE_KEY_PATH` points to PEM file on disk. If developer uses inline key in env var instead, secret is logged by process monitors.
- Files: `src/cli/shared/auth-options.ts` (loads from env), `CLAUDE.md` documentation
- Current mitigation: .env is in .gitignore; documentation recommends file path, not inline key
- Recommendations: Warn if env var contains "-----BEGIN" marker (likely inline key); validate keyfile permissions (600); consider keyring integration for production

**Refresh Token Single-Use Vulnerability:**

- Risk: Meetup's single-use refresh token must be persisted immediately after fetch. Race condition: if save fails after fetch, token is lost and new token unretrievable.
- Files: `src/auth/refresh-token.ts` (lines 51-54)
- Current mitigation: Synchronous save before cache assignment; no async delay
- Recommendations: Add explicit error handling if save fails; log which operation failed; abort export rather than silently losing token

## Performance Bottlenecks

**Synchronous JSONL Write Serialization:**

- Problem: Each write is queued sequentially on a single WriteStream (line 32 in `src/archive/jsonl-writer.ts`). No batching.
- Files: `src/archive/jsonl-writer.ts` (Promise-per-write model)
- Cause: Each `write()` call creates a new Promise and waits for stream callback
- Improvement path: Batch writes (e.g., 100 at a time) to reduce syscall overhead; use `Buffer` pool to minimize allocation

**GraphQL Client Creates New Client Per Request:**

- Problem: `MeetupGraphqlClient.requestWithRetry()` creates a new `GraphQLClient` instance on every request (line 111 in `src/meetup/client.ts`)
- Files: `src/meetup/client.ts` (lines 101-133)
- Cause: No client reuse across requests
- Improvement path: Cache GraphQLClient instance per endpoint; reuse across all requests in export session

**N+1 Query Pattern in Event Export:**

- Problem: For each event in `listEvents`, the orchestrator calls `getEventDetails` separately (lines 172-184 in `src/export/orchestrator.ts`)
- Files: `src/export/orchestrator.ts`, `src/meetup/functions/get-event-details.ts`
- Cause: Single event ID lookup required; no batch endpoint available in Meetup API
- Improvement path: If Meetup API adds batch endpoint, refactor to use it; document API limitation

## Fragile Areas

**Cursor Loop Detection (Simple String Match):**

- Files: `src/meetup/functions/list-groups.ts` (line 89)
- Why fragile: Detects cursor loops by checking if `endCursor` repeats in same pagination session. If API returns same cursor twice in a row (which indicates pagination bug), export hangs forever on the `for(;;)` loop with no timeout.
- Safe modification: Add iteration counter; throw error if > 10k iterations without completing; add timeout per page fetch
- Test coverage: `test/meetup/` exists but only tests auth; no pagination tests

**CSV Writing Without Validation of Row Structure:**

- Files: `src/archive/csv/index.ts`, `src/archive/csv/write-csv.ts`
- Why fragile: CSV columns are hardcoded; if privacy filters add/remove fields, writer creates misaligned CSV without error
- Safe modification: Add runtime validation that row objects match expected schema before writing
- Test coverage: No CSV writer tests in test suite

**Privacy Mode String Validation (Allowed List):**

- Files: `src/export/orchestrator.ts` (line 41: `privacyMode: PrivacyMode`), `src/cli/commands/export.ts` (lines 73-76)
- Why fragile: CLI validates privacy mode before passing to orchestrator, but orchestrator doesn't revalidate. If privacy mode is constructed dynamically elsewhere, invalid value could slip through.
- Safe modification: Add runtime Zod schema validation in orchestrator; treat privacy mode as untrusted at boundary
- Test coverage: Privacy filters are tested in `test/privacy/` but mode validation is not

**Manifest Schema Mismatch with Counts:**

- Files: `src/export/orchestrator.ts` (lines 336-373), `src/archive/manifest.ts` (type definition)
- Why fragile: Manifest includes `counts` object structure that mirrors `ExportCounts`. If either structure changes, mismatch happens silently (different shapes can still serialize to JSON).
- Safe modification: Use Zod schema for manifest data; validate before write
- Test coverage: No manifest write tests

## Scaling Limits

**Meetup API Rate Limit Margin (450/500 req-min):**

- Current capacity: 450 requests per 60 seconds (90% of documented 500-point limit)
- Limit: Default `maxConcurrent: 2` means only 2 parallel requests; very large networks with 10k+ events may timeout
- Scaling path: Make `maxConcurrent` and reservoir configurable via CLI; analyze actual cost weights for large event queries; consider adaptive concurrency

**Memory Accumulation in Maps:**

- Files: `src/export/orchestrator.ts` (lines 145, 171, 225)
- Problem: `eventMap`, `eventDetailsMap`, and `seenCursors` accumulate in memory. For networks with 100k+ events, this consumes significant RAM.
- Scaling path: Use streaming JSONL write without intermediate maps; for deduplication, query by presence in JSONL instead of memory set

**CSV Row Buffer Before Write:**

- Files: `src/export/orchestrator.ts` (lines 105-109)
- Problem: All CSV rows accumulated in arrays (`groupCsvRows`, `eventCsvRows`, `rsvpCsvRows`, etc.) before batch write (line 321+). Large exports (100k+ RSVPs) cause OOM.
- Scaling path: Stream CSV writes per entity; write header once, append rows incrementally

## Dependencies at Risk

**jose v6.0.10:**

- Risk: ECDSA key generation and RS256 signing depend on jose. No updates to jose would block security patches.
- Impact: If vulnerability found in jose JWT handling, must coordinate release
- Migration plan: Monitor jose releases; pin to minor version and test before major version bumps

**bottleneck v2.19.5:**

- Risk: Rare library; maintained by single author. No major version since 2019.
- Impact: Rate limiting relies entirely on bottleneck; if critical bug found, no alternative rate limiter in TypeScript ecosystem
- Migration plan: Understand bottleneck source thoroughly; document fallback approach (manual Bottleneck reimplementation if needed)

**graphql-request v7.1.2:**

- Risk: Wrapper around graphql.js; depends on graphql-js which is under GraphQL Foundation, but graphql-request is less frequently updated
- Impact: New Meetup GraphQL schema features may require schema updates before code generation
- Migration plan: Stay up-to-date with graphql-codegen compatibility

## Missing Critical Features

**No Resume on Crash:**

- Problem: Large exports cannot safely resume. If export crashes at 50k RSVPs out of 200k, restarting exports all 200k again.
- Blocks: Production-ready use for large Pro networks

**No Batch Event Details Fetch:**

- Problem: Each event requires separate API call. Large networks hit rate limit even with modest concurrency.
- Blocks: Efficient export of networks with 10k+ events

**No Input Validation with Zod at Boundary:**

- Problem: CLI options parsed as strings, CLI commands pass to orchestrator without validation. Orchestrator trusts input types.
- Blocks: Security (untrusted input could slip through); future refactoring safety

## Test Coverage Gaps

**GraphQL Client Retry Logic:**

- What's not tested: `MeetupGraphqlClient.requestWithRetry()` retry loop with rate limit extraction
- Files: `src/meetup/client.ts` (lines 101-133)
- Risk: Retry on `RATE_LIMITED` with `resetAt` extraction has no test; accidental changes to retry count or delay calculation won't be caught
- Priority: High (core reliability feature)

**Export Orchestration Full Flow:**

- What's not tested: End-to-end export with mixed entity types (groups + events + RSVPs + answers)
- Files: `src/export/orchestrator.ts`
- Risk: Only auth provider tests exist; no integration test of full pipeline
- Priority: High (main feature)

**Privacy Filter Edge Cases:**

- What's not tested: Null email handling in pseudonymized mode; partial pseudonymization (only some fields)
- Files: `src/privacy/filter.ts`
- Risk: Null coalescing and salt application not validated
- Priority: Medium (privacy is critical, but filters are simple)

**CSV Writer Edge Cases:**

- What's not tested: Large strings with newlines/quotes; non-ASCII characters; empty arrays (e.g., `hostNames` join)
- Files: `src/archive/csv/write-csv.ts`, `src/archive/csv/index.ts`
- Risk: CSV corruption on edge case inputs
- Priority: Medium (csv-stringify handles escaping, but should validate)

**Markdown Event Writer:**

- What's not tested: Slug generation with special characters; YAML frontmatter with quotes; event titles with markdown syntax
- Files: `src/archive/markdown/event.ts`, `src/archive/markdown/slug.ts`
- Risk: Malformed markdown or slug collisions
- Priority: Low (markdown is secondary output format)

---

_Concerns audit: 2026-05-08_