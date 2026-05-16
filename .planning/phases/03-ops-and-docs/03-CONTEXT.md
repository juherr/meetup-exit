# Phase 3: Ops and Docs - Context

**Gathered:** 2026-05-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver the `doctor` command (local-only config validation), rewrite the README as a user-facing setup guide, finalize `.env.example` inline comments, and create `SECURITY.md` at the root. When this phase is complete, a new user can follow the README from zero to first export, self-diagnose config issues with `doctor`, and understand token/key security from `SECURITY.md`.

</domain>

<decisions>
## Implementation Decisions

### doctor command — checks

- **D-01:** `doctor` runs exactly these checks: Bun version ≥ 1.x, required env vars for the configured auth mode (auth-mode aware — not all MEETUP_* vars), private key file exists + permissions 600 (jwt-bearer and refresh-token modes only), default output dir writable, auth-mode coherence.
- **D-02:** Auth-mode awareness: read `MEETUP_AUTH_MODE`, then validate only the env vars required for that mode.
  - `jwt-bearer` → MEETUP_CLIENT_KEY, MEETUP_AUTHORIZED_MEMBER_ID, MEETUP_SIGNING_KEY_ID, MEETUP_PRIVATE_KEY_PATH
  - `access-token` → MEETUP_ACCESS_TOKEN
  - `refresh-token` → MEETUP_CLIENT_SECRET, MEETUP_REFRESH_TOKEN_FILE
- **D-03:** No network call — `doctor` is local-only. Users run `verify-auth` separately to validate credentials against the API.

### doctor command — output

- **D-04:** Output format: one `✓`/`✗` line per check. Example:
  ```
  ✓ Bun version: 1.2.x
  ✓ Auth mode: jwt-bearer
  ✓ MEETUP_CLIENT_KEY: set
  ✗ MEETUP_SIGNING_KEY_ID: missing
  ✓ Private key: ./secrets/meetup-private-key.pem (permissions: 600)

  1 check failed.
  ```
- **D-05:** Exit code 5 (invalid config) when any check fails. Exit 0 when all pass.

### README

- **D-06:** Full rewrite — drop the in-progress status banner and the internal phase roadmap section. The README becomes a clean user-facing document: prerequisites, install, quick start, all commands (including `convert`, `doctor`, `--resume`), full export example with realistic flags, privacy modes, development section.
- **D-07:** OAuth setup walkthrough is config-value focused only — document what values are needed (client key, member ID, signing key ID, private key path) and their expected format. No step-by-step Meetup portal navigation (fragile, Meetup UI can change).
- **D-08:** Include one complete realistic export example:
  ```
  meetup-exit export --network mygroup --out ./archive --include-events --include-rsvps --privacy-mode no-email
  ```
- **D-09:** Commands table must include all commands: `verify-auth`, `probe-network`, `introspect`, `export`, `convert`, `doctor`.

### Security guide

- **D-10:** `SECURITY.md` at project root (GitHub convention — GitHub links to it automatically in the security tab).
- **D-11:** Lead content: pseudonymization salt is ephemeral (not persisted across runs) — each `export --privacy-mode pseudonymized` run produces different hashes; never mix pseudonymized exports from different runs for cross-referencing members.
- **D-12:** Also covers: private key must be mode 600, never committed; token handling (never log, mask in errors); gitignore config (`.env`, `secrets/`, `exports/`).

### .env.example

- **D-13:** `.env.example` already contains all `MEETUP_*` variables. The task is to ensure every variable has a meaningful English inline comment explaining its purpose and expected format. No structural changes needed.

### Claude's Discretion

- Exact wording and ordering of README sections beyond the locked decisions above.
- Whether `doctor` shows a one-line summary at the end ("All checks passed." / "N check(s) failed.") — yes, include this.
- Handling of `MEETUP_AUTH_MODE` missing in `doctor` (default to showing all vars, or prompt user to set it first).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Roadmap and Requirements

- `.planning/ROADMAP.md` — Phase 3 goal, requirements (DIAG-01, DOC-01, DOC-02, DOC-03), success criteria
- `.planning/REQUIREMENTS.md` — Full requirement definitions and traceability

### Specifications

- `specs/07-cli-spec.md` §2.6 — `doctor` command spec: Bun version, env vars, key permissions, output writability, auth-mode coherence
- `specs/04-authentication.md` — Auth modes (jwt-bearer, access-token, refresh-token) and required vars per mode

### Existing Source Files (read before touching)

- `src/cli/commands/verify-auth.ts` — Pattern to follow for a new CLI command (exit codes, error handling)
- `src/cli/commands/probe-network.ts` — Another command pattern; shows how auth options are consumed
- `src/cli/main.ts` — Where to register the new `doctor` command
- `src/cli/shared/auth-options.ts` — Auth mode resolution and option building — reuse for env var checks
- `README.md` — Current state (140 lines, outdated — full rewrite in this phase)
- `.env.example` — Current state — only needs comment improvements

### Prior Phase Context

- `.planning/phases/02-export-resilience/02-CONTEXT.md` — Prior phase context; note: pseudonymization salt concern documented here for security guide

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- `src/cli/shared/auth-options.ts` — Contains auth mode resolution logic and required env vars per mode. The `doctor` command can reuse or mirror this for its env var checks rather than duplicating the auth mode → required vars mapping.
- `src/errors/` — Custom error types (AuthenticationError, etc.) — doctor does not need these (local-only, no network), but the exit code conventions from CLI commands apply.
- Commander command registration pattern in `src/cli/main.ts` — follow existing pattern to add the `doctor` command.

### Established Patterns

- CLI commands in `src/cli/commands/` each export a function that takes a `Commander.Command` and registers it. Follow this pattern for `doctor.ts`.
- Exit codes are well-defined: 0 = success, 1 = general error, 2 = auth error, 3 = network access denied, 4 = partial export with errors, 5 = invalid config. `doctor` exits 5 when checks fail.
- Logger interface from `src/logging/` used by all commands — use it for `doctor` output too.

### Integration Points

- `src/cli/main.ts` — register `doctorCommand` here alongside existing commands.
- `src/cli/commands/doctor.ts` — new file, follows the same pattern as `verify-auth.ts` and `probe-network.ts`.
- No changes to export orchestrator, archive writers, or meetup client needed.

</code_context>

<specifics>
## Specific Ideas

- The `doctor` output preview confirmed by user:
  ```
  ✓ Bun version: 1.2.x
  ✓ Auth mode: jwt-bearer
  ✓ MEETUP_CLIENT_KEY: set
  ✓ MEETUP_AUTHORIZED_MEMBER_ID: set
  ✓ MEETUP_SIGNING_KEY_ID: set
  ✓ Private key: ./secrets/meetup-private-key.pem (permissions: 600)
  ✗ MEETUP_SIGNING_KEY_ID: missing

  1 check failed.
  ```
- The pseudonymization salt warning in SECURITY.md is a **carry-forward concern** from Phase 2 — it was flagged as a documentation gap that must be addressed in this phase.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 3-Ops and Docs*
*Context gathered: 2026-05-16*
