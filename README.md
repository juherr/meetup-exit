# meetup-exit

Export Meetup Pro network data before leaving the platform.

Fetches groups, events, RSVPs, and registration answers via the Meetup GraphQL API. Stores raw JSONL for reproducibility and generates CSV/Markdown/HTML archives.

> **Status**: MVP in progress — export pipeline is functional (groups, events, RSVPs, registration answers, CSV/Markdown archive, privacy modes). Remaining: `convert`, `doctor`, resume support, error records.

## Prerequisites

- [Bun](https://bun.sh) ≥ 1.x
- A Meetup Pro account with API access
- An OAuth client configured in the Meetup developer portal

## Installation

```bash
bun install
```

## Quick start

Copy `.env.example` to `.env` and fill in your credentials (see [Authentication](#authentication) below), then:

```bash
# Verify authentication
bun src/cli/main.ts verify-auth

# Check Pro network access
bun src/cli/main.ts probe-network --network <urlname>

# Dump GraphQL schema (needed for codegen)
bun src/cli/main.ts introspect --out schema/introspection.json
```

## Authentication

Three modes, configured via `MEETUP_AUTH_MODE`:

### `jwt-bearer` (recommended)

OAuth 2 JWT Bearer flow — requires an RSA key pair registered with Meetup.

```env
MEETUP_AUTH_MODE=jwt-bearer
MEETUP_CLIENT_KEY=<your-client-key>
MEETUP_AUTHORIZED_MEMBER_ID=<your-member-id>
MEETUP_SIGNING_KEY_ID=<your-key-id>
MEETUP_PRIVATE_KEY_PATH=./secrets/meetup-private-key.pem
```

### `access-token` (debug)

```env
MEETUP_AUTH_MODE=access-token
MEETUP_ACCESS_TOKEN=<token>
```

All options can also be passed as CLI flags — run `bun src/cli/main.ts --help` for details.

## Commands

| Command                             | Description                                               |
| ----------------------------------- | --------------------------------------------------------- |
| `verify-auth`                       | Test authentication, display identity                     |
| `probe-network --network <urlname>` | Confirm Pro network access                                |
| `introspect --out <file>`           | Dump GraphQL schema to JSON                               |
| `export --network <urlname> --out <dir> [flags]` | Export all network data to an archive      |

Key `export` flags: `--include-groups`, `--include-events`, `--include-rsvps`, `--include-registration-answers`, `--include-markdown`, `--privacy-mode <mode>`, `--dry-run`.

Exit codes: `0` success, `1` general error, `2` auth error, `3` network access denied, `4` partial export with errors, `5` invalid config.

## Development

```bash
bun src/cli/main.ts          # Run CLI (Bun loads .env automatically)
vp check                     # Lint + format + typecheck
vp check --fix               # Auto-fix formatting
vp test                      # Run tests
vp pack                      # Build → dist/cli/main.js

# After generating schema/introspection.json:
bun run codegen              # Generate typed GraphQL SDK
```

## Project layout

```
src/
  auth/       MeetupAuthProvider interface + implementations
  meetup/     GraphQL client + typed query functions
  export/     Export orchestration (include/exclude flags, metrics)
  archive/    File writers: JSONL, CSV, Markdown, manifest, checksums
  privacy/    Email filtering, pseudonymization, GDPR report
  cli/        Commands, shared options, logging
specs/        Functional and technical specifications (French)
test/         Unit tests
```

Full specs in `specs/README.md`.

## Roadmap

### Phase 1 — Bootstrap + auth ✅

- CLI scaffold (`commander`, Bun, Vite+)
- `AccessTokenAuthProvider` (debug direct token)
- `MeetupGraphqlClient` (Bottleneck rate limiting, retry on `RATE_LIMITED`)
- `verify-auth` command

### Phase 2 — Network probe + schema ✅

- `OAuthJwtBearerAuthProvider` (RS256 JWT → OAuth2 access token)
- `probe-network` command
- `introspect` command
- `listGroups` (paginated, cursor loop detection)

### Phase 3 — Export pipeline ✅

- `export` command — groups → events → event details → RSVPs → registration answers
- Raw JSONL archive writer (append, UTF-8)
- CSV writers (groups, events, RSVPs, attendees, registration answers)

### Phase 4 — Archive formats ✅

- Markdown event pages (YAML frontmatter, slugification)
- `manifest.json` + `sha256.txt` checksums

### Phase 5 — Privacy + GDPR ✅

- `no-email`, `pseudonymized`, `public-archive` modes
- GDPR report (`reports/gdpr-review.md`)
- `OAuthRefreshTokenAuthProvider` (single-use refresh token persistence)

### Phase 6 — Hardening (in progress)

- `convert` command (re-derive CSV/Markdown from existing raw archive)
- Resume support (`--resume`, local index to skip already-exported entities)
- Error records (`raw/errors.jsonl`, `reports/errors.md`)
- `doctor` command (env check, key permissions, output writability)