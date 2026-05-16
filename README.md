# meetup-exit

Export Meetup Pro network data before leaving the platform.

Fetches groups, events, RSVPs, and registration answers via the Meetup GraphQL API. Stores raw JSONL for reproducibility and generates CSV and Markdown archives with configurable privacy modes.

## Prerequisites

- [Bun](https://bun.sh) ≥ 1.x
- A Meetup Pro account with API access
- OAuth client credentials from the Meetup developer portal

## Installation

```bash
bun install
```

The CLI runs directly via Bun in development — no build step required.

## Quick start

1. Copy `.env.example` to `.env` and fill in your credentials (see [Authentication](#authentication) below).
2. Run `doctor` to validate your local configuration:

```bash
bun src/cli/main.ts doctor
```

3. Verify your credentials against the API:

```bash
bun src/cli/main.ts verify-auth
```

4. Check that your Pro network is accessible:

```bash
bun src/cli/main.ts probe-network --network <urlname>
```

If all checks pass, you are ready to run a full export.

## Authentication

Three modes, configured via `MEETUP_AUTH_MODE`:

### `jwt-bearer` (recommended)

OAuth 2 JWT Bearer flow using an RSA key pair registered with your Meetup OAuth application.

Required configuration values:

- `MEETUP_CLIENT_KEY` — OAuth client key string from your Meetup OAuth application
- `MEETUP_AUTHORIZED_MEMBER_ID` — Numeric member ID of the Meetup member authorizing the OAuth client
- `MEETUP_SIGNING_KEY_ID` — Identifier of the RSA key pair registered with your OAuth application
- `MEETUP_PRIVATE_KEY_PATH` — Path to the RSA private key PEM file (must be `chmod 600`)

### `access-token` (debug)

Direct bearer token — short-lived, intended for debugging only.

Required: `MEETUP_ACCESS_TOKEN`

### `refresh-token`

OAuth refresh token flow — Meetup refresh tokens are single-use; the new token is persisted automatically after each refresh.

Required: `MEETUP_CLIENT_SECRET`, `MEETUP_REFRESH_TOKEN_FILE`

All options can also be passed as CLI flags — run `bun src/cli/main.ts --help` for details.

## Commands

| Command                                          | Purpose                                                                    |
| ------------------------------------------------ | -------------------------------------------------------------------------- |
| `verify-auth`                                    | Test authentication and display identity (`self`)                          |
| `probe-network --network <urlname>`              | Confirm Pro network access, exit 3 on failure                              |
| `introspect --out <file>`                        | Dump GraphQL schema to JSON                                                |
| `export --network <urlname> --out <dir> [flags]` | Export all network data to an archive                                      |
| `convert --input <dir> --out <dir>`              | Re-derive CSV/Markdown from an existing raw JSONL archive                  |
| `doctor`                                         | Validate local config (Bun version, env vars, key permissions, output dir) |

Key `export` flags: `--include-events`, `--include-rsvps`, `--include-registration-answers`, `--include-photos`, `--privacy-mode <mode>`, `--dry-run`, `--resume`.

Exit codes: `0` success, `1` general error, `2` auth error, `3` network access denied, `4` partial export with errors, `5` invalid config.

## Full export example

```bash
meetup-exit export --network mygroup --out ./archive --include-events --include-rsvps --privacy-mode no-email
```

This exports all events and RSVPs for the `mygroup` network, stripping email addresses from CSV and Markdown outputs (`no-email` mode). The raw JSONL archive is written to `./archive/raw/`.

### Resuming an interrupted export

```bash
meetup-exit export --network mygroup --out ./archive --include-events --include-rsvps --privacy-mode no-email --resume
```

If the export is interrupted, re-run with `--resume` to continue from where it stopped (uses the saved index at `.meetup-exit/index.json`).

## Privacy modes

| Mode             | Description                                                                                 |
| ---------------- | ------------------------------------------------------------------------------------------- |
| `full`           | All data included — treat the archive as sensitive, for private use only                    |
| `no-email`       | Email addresses stripped from CSV and Markdown outputs; raw JSONL may remain full           |
| `pseudonymized`  | Member IDs and email addresses replaced with stable salted hashes (e.g., `member_a3f19c2b`) |
| `public-archive` | Events, dates, descriptions, hosts, and photos only — no RSVPs, emails, or form answers     |

Note: pseudonymized hashes are **not stable across export runs** — each run generates a new salt. Do not cross-reference pseudonymized archives from different runs to correlate members. See [SECURITY.md](SECURITY.md) for details.

## Development

```bash
bun src/cli/main.ts          # Run CLI in dev (Bun runs TS natively, loads .env automatically)
vp check                     # Lint + format check (oxlint + oxfmt + tsc)
vp check --fix               # Auto-fix formatting issues
vp test                      # Run tests (vitest)
vp pack                      # Build → dist/cli/main.js (tsdown/Rolldown)
bun run codegen              # Regenerate typed GraphQL SDK from schema/introspection.json
```

## Project layout

```
src/
  auth/       MeetupAuthProvider interface + implementations
  meetup/     GraphQL client + typed query functions
  export/     Export orchestration (include/exclude flags, resume, metrics)
  archive/    File writers: JSONL, CSV, Markdown, manifest, checksums
  privacy/    Email filtering, pseudonymization, PII classification, GDPR report
  cli/        Commands, shared options, logging
specs/        Functional and technical specifications (French)
test/         Unit tests
```

Full specs in `specs/README.md`.

See [SECURITY.md](SECURITY.md) for token handling, private key storage, and gitignore configuration.