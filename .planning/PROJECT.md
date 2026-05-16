# meetup-exit

## What This Is

`meetup-exit` is a TypeScript CLI and library for exporting Meetup Pro network data before leaving the platform. It fetches groups, events, RSVPs, and registration answers via the Meetup GraphQL API, stores raw JSONL archives, and generates CSV, Markdown, and HTML outputs with configurable privacy modes.

## Core Value

A Meetup Pro admin can run one command and get a complete, reproducible archive of their network data — including raw JSONL for re-processing — before the platform is abandoned.

## Requirements

### Validated

- ✓ Auth: AccessTokenAuthProvider, OAuthJwtBearerAuthProvider, OAuthRefreshTokenAuthProvider — existing
- ✓ `verify-auth` command (exit 2 on failure, no token leakage) — existing
- ✓ `probe-network` command (exit 3 on access denied) — existing
- ✓ `introspect` command (dumps GraphQL schema) — existing
- ✓ MeetupGraphqlClient with Bottleneck rate limiting + RATE_LIMITED retry — existing
- ✓ Export: groups, events (+ details), RSVPs, registration answers — existing
- ✓ Archive writers: JSONL, CSV (groups/events/rsvps/attendees/answers), Markdown, manifest.json, checksums — existing
- ✓ Privacy modes: full, no-email, pseudonymized, public-archive, GDPR report — existing
- ✓ `convert` command — re-derive CSV/Markdown from existing raw JSONL without re-fetching API (Validated in Phase 1)
- ✓ Photos export — featuredEventPhoto URL extraction, CSV photos output, event_id/photo_id/base_url (Validated in Phase 2)
- ✓ Resume — `--resume` flag, per-entity-type index at `.meetup-exit/index.json`, re-derives CSV via runConvert (Validated in Phase 2)
- ✓ Error records — `raw/errors.jsonl` + `reports/errors.md`, export continues on entity failure (Validated in Phase 2)
- ✓ `doctor` command — auth-mode-aware local config validator: Bun version, env vars, key permissions (600), output dir writability (Validated in Phase 3)
- ✓ README — full setup guide: OAuth Client, JWT bearer flow, all 6 commands, full export example, all four privacy modes (Validated in Phase 3)
- ✓ `.env.example` — all 9 `MEETUP_*` variables with English inline comments (Validated in Phase 3)
- ✓ Security guide — SECURITY.md covering ephemeral salt, private key, token handling, full-export PII sensitivity, gitignore config (Validated in Phase 3)

### Active

(None — all v1.0 requirements shipped)

### Out of Scope

- Interactive prompts — no interactive prompts in MVP (spec constraint)
- Real-time sync — one-shot export only, no incremental watch mode
- HTML archive — mentioned in spec intro but not in any backlog ticket; defer
- OAuth web flow — JWT Bearer is the primary flow; no browser redirect needed

## Context

- **v1.0 shipped:** 2026-05-16 — full MVP complete (3 phases, 6 plans, ~3,000 LOC TypeScript)
- Stack: Bun runtime (TypeScript natively), Vite+ toolchain (oxlint + oxfmt + tsc), vitest, tsdown/Rolldown build
- GraphQL: `graphql-request` + GraphQL Code Generator (only `self.graphql` query generated; other queries are TypeScript functions in `src/meetup/functions/`)
- Auth: `jose` for RS256 JWT; OAuth 2 JWT Bearer is the primary production flow
- Rate limiting: `bottleneck` at 450 req/min, 2 concurrent, minTime 250ms
- Known: CSV rows buffered in memory before write — scaling risk for 100k+ RSVPs; acceptable for current scope
- Known: Pseudonymization salt not persisted between runs — documented in SECURITY.md (ephemeral by design)

## Constraints

- **Runtime**: Bun only — no Node.js compatibility layer needed
- **Auth**: Never log/expose access tokens, refresh tokens, or private keys
- **Export behavior**: One entity failure → log + continue; auth failure → stop immediately
- **Dry run**: `--dry-run` must not write export files
- **Config**: All CLI options must also be settable via `MEETUP_*` env vars

## Key Decisions

| Decision                                                    | Rationale                                                                      | Outcome                                |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------- |
| Six strict modules with no cross-boundary leakage           | Testability and separation of concerns                                         | ✓ Good — already validated in codebase |
| Bottleneck reservoir at 450/min (not 500)                                       | Safety margin below Meetup's 500-point limit                                        | — Pending real-traffic validation           |
| Raw JSONL as source of truth                                                    | Allows re-processing without re-fetching API (convert command depends on this)      | ✓ Good                                      |
| Refresh tokens are single-use — persist after every refresh                    | Meetup API behavior                                                                 | ✓ Good                                      |
| Resume index at `<outDir>/.meetup-exit/index.json` (per-export scope)          | Isolates resume state to the export directory; no global state                      | ✓ Good                                      |
| Entity-type granularity for resume checkpointing (not per-event)               | Minimal sufficient checkpoint — avoids per-entity overhead                          | ✓ Good                                      |
| `doctor` prints `set`/`missing` only — never env var values                    | Prevent secret leakage in terminal captures (threat model)                          | ✓ Good                                      |
| SECURITY.md lead section: ephemeral pseudonymization salt warning               | Highest severity issue for users; must appear first                                 | ✓ Good                                      |
| README OAuth section: config-value focused, no portal nav steps                 | Portal UI can change; required config values are stable                             | ✓ Good                                      |
| `readFile` from `node:fs/promises` instead of `Bun.file()` in resume-index.ts | `Bun.file()` unavailable in vitest environment; node:fs/promises works in both      | ✓ Good — discovered during Phase 2 testing  |

---

_Last updated: 2026-05-16 after v1.0 milestone_