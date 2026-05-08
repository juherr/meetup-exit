# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

`meetup-exit` is a TypeScript CLI + library for exporting Meetup Pro network data before leaving the platform. It fetches data via the Meetup GraphQL API, stores raw JSONL, and generates CSV/Markdown/HTML archives. Full specs are in `specs/`.

## Stack

- **Runtime**: Bun (TypeScript natively, no tsx needed). Tool versions pinned in `.mise.toml`.
- **Toolchain**: Vite+ (`vp` CLI) — oxlint + oxfmt + tsc, vitest, tsdown/Rolldown build
- **CLI**: `commander`
- **GraphQL**: `graphql-request` + GraphQL Code Generator (typed queries)
- **Auth**: `jose` (JWT/JWS for OAuth 2 JWT Bearer flow)
- **Rate limiting**: `bottleneck`
- **Validation**: `zod`
- **CSV**: `csv-stringify`

## Commands

```bash
bun src/cli/main.ts   # Run CLI in dev (Bun runs TS natively, loads .env automatically)
vp check              # oxlint + oxfmt + tsc — run before every commit
vp check --fix        # Auto-fix formatting issues
vp test               # vitest (via vite-plus)
vp pack               # Build → dist/cli/main.js (tsdown/Rolldown, ESM + .d.ts)
bun run codegen       # graphql-codegen (requires schema/introspection.json)
```

Single test file: `vp test test/auth/access-token.test.ts`

## Architecture

Six strict modules — no cross-boundary leakage:

```
src/
  auth/       MeetupAuthProvider interface + 3 implementations
  meetup/     GraphQL client (Bottleneck + retry), typed query functions
  export/     Orchestration: include/exclude flags, resume, manifest, metrics
  archive/    File writers: JSONL, CSV, Markdown, manifest.json, checksums
  privacy/    Email filtering, pseudonymization, PII classification, GDPR report
  cli/        commander commands, env/config loading, exit codes, human logs
```

The GraphQL client (`meetup/`) has no knowledge of the filesystem. The archive module has no knowledge of the API. The CLI calls core; core does not call CLI.

## Auth module

Three `MeetupAuthProvider` implementations (all expose `getAccessToken(): Promise<string>`):

- `AccessTokenAuthProvider` — debug/direct token
- `OAuthJwtBearerAuthProvider` — **primary MVP flow**: RS256 JWT → POST `https://secure.meetup.com/oauth2/access` → access token; caches token with 60s safety margin
- `OAuthRefreshTokenAuthProvider` — Meetup refresh tokens are **single-use**; new token must be persisted after every refresh

JWT Bearer assertion claims: `sub` = authorizedMemberId, `iss` = clientKey, `aud` = `api.meetup.com`, `exp` = 120s. Header: `alg: RS256`, `kid` = signingKeyId.

Config priority: CLI flags → env vars → `.env` file → local config file.

## GraphQL client

`MeetupGraphqlClient` wraps `graphql-request` with `Bottleneck`:

- Default reservoir: 450 req/min (safety margin below Meetup's 500-point limit)
- Default concurrency: 2, minTime: 250ms
- On `RATE_LIMITED` extension code: wait until `resetAt`, then retry (max 4 attempts)
- Query cost weights defined in `MeetupQueryCost` (e.g., eventDetails=10, rsvpsPage=15)
- Never logs access tokens

Key API functions: `getSelf`, `getProNetworkProbe`, `listGroups`, `listEvents`, `getEventDetails`, `listEventRegistrationAnswers`

## Archive format

```
exports/meetup-YYYY-MM-DD/
  manifest.json
  schema/introspection.json
  raw/*.jsonl            # ArchiveRecord lines, append-only, no pretty-print
  csv/*.csv              # groups, events, rsvps, attendees, registration-answers
  markdown/events/       # YYYY-MM-DD-slug.md with YAML frontmatter
  reports/               # export-summary.md, gdpr-review.md, errors.md
  checksums/sha256.txt
```

Every JSONL record: `{ source, exportedAt, entityType, sourceId, parentIds?, raw }`.

Resume index stored at `.meetup-exit/index.json` keyed by `(entityType, sourceId, parentIds)`.

## Privacy modes

- `full` — all data, private archive only
- `no-email` — emails stripped from CSV/Markdown; raw may stay full if `--raw-privacy full`
- `pseudonymized` — member ids/emails replaced with salted stable hashes (`member_<hex8>`)
- `public-archive` — events/dates/descriptions/hosts/photos only; no RSVPs, no emails, no form answers

## CLI commands

| Command                             | Purpose                                                           |
| ----------------------------------- | ----------------------------------------------------------------- |
| `verify-auth`                       | Test auth, display `self`, exit 2 on failure                      |
| `probe-network --network <urlname>` | Confirm Pro network access, exit 3 on failure                     |
| `introspect --out <file>`           | Dump GraphQL schema                                               |
| `export --network --out [flags]`    | Main export command                                               |
| `convert --input --out`             | Re-derive CSV/Markdown from existing raw archive                  |
| `doctor`                            | Check Node version, env vars, key permissions, output writability |

Exit codes: 0=success, 1=general error, 2=auth error, 3=network access denied, 4=partial export with errors, 5=invalid config.

## Key conventions

- All code comments in **English** (specs are in French, code is not)
- No `any` except at external error boundaries; use `unknown` for caught errors
- Validate all external configs with `zod`
- Never log/expose access tokens, refresh tokens, or private keys — mask them in errors
- On export: one entity failure → log + continue; auth failure → stop immediately
- `--dry-run` must not write export files
- No interactive prompts in MVP
- All options must also be settable via environment variables (`MEETUP_*`)

## Environment variables

```env
MEETUP_ENDPOINT=https://api.meetup.com/gql-ext
MEETUP_AUTH_MODE=jwt-bearer           # access-token | jwt-bearer | refresh-token
MEETUP_ACCESS_TOKEN=
MEETUP_CLIENT_KEY=
MEETUP_AUTHORIZED_MEMBER_ID=
MEETUP_SIGNING_KEY_ID=
MEETUP_PRIVATE_KEY_PATH=./secrets/meetup-private-key.pem
MEETUP_CLIENT_SECRET=
MEETUP_REFRESH_TOKEN_FILE=
```

`.env`, `exports/`, `secrets/`, `schema/introspection.json` are gitignored.

## Recommended implementation order

See `specs/11-project-bootstrap.md` §8: bootstrap CLI → `AccessTokenAuthProvider` → `MeetupGraphqlClient` → `verify-auth` → `OAuthJwtBearerAuthProvider` → `probe-network` → `introspect` → codegen → exports (groups → events → rsvps → registration answers).