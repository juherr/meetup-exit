# Phase 3: Ops and Docs - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-16
**Phase:** 3-Ops and Docs
**Areas discussed:** doctor checks & output, doctor exit behavior, README scope, Security guide location & depth

---

## doctor checks & output

| Option | Description | Selected |
|--------|-------------|----------|
| ✓/✗ per line | One line per check: `✓ Bun 1.2.x` / `✗ MEETUP_CLIENT_KEY missing` | ✓ |
| Grouped sections | Checks grouped by category (Runtime, Auth, Filesystem) with summary | |

**User's choice:** ✓/✗ per line

---

| Option | Description | Selected |
|--------|-------------|----------|
| Exactly as spec | Bun version, env vars for auth mode, key permissions, output writability, auth-mode coherence | ✓ |
| Add Node version check | Also check Node.js (spec says "Node version" but project uses Bun) | |
| Skip output dir check | Output dir not known at doctor time | |

**User's choice:** Exactly as spec

---

| Option | Description | Selected |
|--------|-------------|----------|
| Auth-mode aware | Read MEETUP_AUTH_MODE, validate only required vars for that mode | ✓ |
| All MEETUP_* vars | Report presence/absence of every MEETUP_* variable regardless of mode | |

**User's choice:** Auth-mode aware

---

## doctor exit behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Exit 5 | Exit 5 = invalid config — already defined in project exit code convention | ✓ |
| Exit 1 | General error | |
| Exit 0 always | Always exit 0 regardless of check results | |

**User's choice:** Exit 5

---

| Option | Description | Selected |
|--------|-------------|----------|
| Local-only | No network call; user runs verify-auth separately for token validation | ✓ |
| Optional --check-auth flag | Local checks by default + optional getSelf() call | |
| Always call getSelf | Full end-to-end validation, always network | |

**User's choice:** Local-only

---

## README scope

| Option | Description | Selected |
|--------|-------------|----------|
| Config values only | Document required config values and format — no step-by-step portal navigation | ✓ |
| Step-by-step portal guide | Walk through Meetup developer portal UI — fragile, can change | |

**User's choice:** Config values only (OAuth walkthrough)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Full rewrite | Drop status banner and internal phase roadmap; clean user-facing document | ✓ |
| Update in place | Keep current structure, fix status banner, add missing commands | |

**User's choice:** Full rewrite

---

| Option | Description | Selected |
|--------|-------------|----------|
| Full example | Show realistic export invocation with multiple flags | ✓ |
| Flag reference only | Just list available flags; user composes their own command | |

**User's choice:** Full example with realistic flags

---

## Security guide location & depth

| Option | Description | Selected |
|--------|-------------|----------|
| SECURITY.md at root | Standard GitHub convention; GitHub links to it automatically | ✓ |
| docs/security.md | Under a docs/ folder | |
| Section in README | No extra file; makes README longer | |

**User's choice:** SECURITY.md at root

---

| Option | Description | Selected |
|--------|-------------|----------|
| Salt warning + private key storage | Lead with pseudonymization salt ephemeral warning; private key permissions; token masking | ✓ |
| Full-export sensitivity only | Focus on data classification of what a full export contains | |
| Both equally | Cover data classification + operational security | |

**User's choice:** Salt warning + private key storage (lead content)

---

## Claude's Discretion

- Exact wording and ordering of README sections
- Whether `doctor` shows a summary line at the end ("All checks passed." / "N check(s) failed.")
- How to handle `MEETUP_AUTH_MODE` missing in `doctor` (default behavior)

## Deferred Ideas

None — discussion stayed within phase scope.
