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

### Active

- [ ] `convert` command — re-derive CSV/Markdown from existing raw JSONL without re-fetching API
- [ ] Photos export — featuredEventPhoto URL extraction, CSV photos output (Epic 5.6)
- [ ] Resume — `--resume` flag, local index at `.meetup-exit/index.json`, no duplicates (Epic 9.1)
- [ ] Error records — `raw/errors.jsonl` + `reports/errors.md`, export continues on entity failure (Epic 9.2)
- [ ] `doctor` command — check Bun version, env vars, key permissions, output writability
- [ ] README — setup OAuth Client, JWT bearer flow, full export examples, privacy modes
- [ ] `.env.example` — all MEETUP_* variables with English comments
- [ ] Security guide — tokens, private key, full exports, gitignore

### Out of Scope

- Interactive prompts — no interactive prompts in MVP (spec constraint)
- Real-time sync — one-shot export only, no incremental watch mode
- HTML archive — mentioned in spec intro but not in any backlog ticket; defer
- OAuth web flow — JWT Bearer is the primary flow; no browser redirect needed

## Context

- Stack: Bun runtime (TypeScript natively), Vite+ toolchain (oxlint + oxfmt + tsc), vitest, tsdown/Rolldown build
- GraphQL: `graphql-request` + GraphQL Code Generator (only `self.graphql` query currently generated; other queries are hand-written functions)
- Auth: `jose` for RS256 JWT; OAuth 2 JWT Bearer is the primary production flow
- Rate limiting: `bottleneck` at 450 req/min, 2 concurrent, minTime 250ms
- Codegen: `bun run codegen` regenerates from `schema/introspection.json` — only the `self` query is in `.graphql` form; other queries are TypeScript functions in `src/meetup/functions/`
- The `export` command is the main command; `convert` will reuse archive writers from `src/archive/`

## Constraints

- **Runtime**: Bun only — no Node.js compatibility layer needed
- **Auth**: Never log/expose access tokens, refresh tokens, or private keys
- **Export behavior**: One entity failure → log + continue; auth failure → stop immediately
- **Dry run**: `--dry-run` must not write export files
- **Config**: All CLI options must also be settable via `MEETUP_*` env vars

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Six strict modules with no cross-boundary leakage | Testability and separation of concerns | ✓ Good — already validated in codebase |
| Bottleneck reservoir at 450/min (not 500) | Safety margin below Meetup's 500-point limit | — Pending validation |
| Raw JSONL as source of truth | Allows re-processing without re-fetching API (convert command depends on this) | ✓ Good |
| Refresh tokens are single-use — persist after every refresh | Meetup API behavior | ✓ Good |

---
*Last updated: 2026-05-08 after brownfield initialization*
