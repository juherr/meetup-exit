# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — MVP

**Shipped:** 2026-05-16
**Phases:** 3 | **Plans:** 6 | **Tasks:** 12

### What Was Built

- API-free `convert` command: reads raw JSONL archives, re-derives CSV/Markdown with privacy modes — no API calls
- Photos CSV: `csv/photos.csv` with `featuredEventPhoto` URLs wired into both `export` and `convert`
- Error persistence: `raw/errors.jsonl` + always-on `reports/errors.md` — export continues on entity errors
- Resume: per-entity-type index at `<outDir>/.meetup-exit/index.json`, full CSV re-derivation via `runConvert` on resume
- `doctor` command: auth-mode-aware local config validator, no network calls, no secret value exposure
- README rewrite, `.env.example` with full English comments, and `SECURITY.md`

### What Worked

- Two-pass JSONL reading pattern (build entity maps first, reference in dependent passes) scaled cleanly to convert and resume
- The `writeCsvFile` delegate pattern made photos.csv trivial to add alongside existing events/groups CSV writers
- Treating `raw/` as append-only source of truth paid off — resume without duplicates was a straight consequence
- Auth-mode-aware env var validation in `doctor` — MEETUP_AUTH_MODE drives which vars are required

### What Was Inefficient

- `Bun.file()` is unavailable in vitest — discovered during Phase 2 testing, required a switch to `node:fs/promises`. Should check runtime compatibility earlier when using Bun-specific APIs in testable modules.
- Pre-existing oxfmt formatting issues in `.planning/` markdown files caused a noisy deviation in Phase 2; auto-fixed but added noise.

### Patterns Established

- JSONL async generator with ENOENT-as-empty: `readJsonlRecords` treats missing files as empty — partial archives work without error
- Error catch block ordering: auth re-throw first, then `logger.warn + counts.errors++`, then error record write (non-dry-run) + push to accumulator
- Resume checkpoint: mark+save immediately after each stage's JSONL writes complete (not at end of full export)
- Dry-run discipline: in-memory accumulators always populated; filesystem writes guarded by `!options.dryRun`
- `doctor` threat model: print `set`/`missing` only — never env var values — to prevent secret leakage

### Key Lessons

1. When adding API-specific runtime calls (e.g., `Bun.file()`), verify vitest compatibility before writing the test — not during execution.
2. Ephemeral pseudonymization salt is a UX footgun — document it prominently at the top of SECURITY.md, not buried in a section.
3. Entity-type-level resume granularity (not per-event) is sufficient for crash recovery and keeps the index tiny.

### Cost Observations

- Sessions: ~8 sessions across 8 days (2026-05-08 to 2026-05-16)
- Plans: 6 plans averaging ~4min each (range: 2min–10min)
- Notable: Resume plan (02-03) was the longest at 10min due to the Bun.file/vitest compatibility fix mid-execution

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change              |
| --------- | -------- | ------ | ----------------------- |
| v1.0      | ~8       | 3      | Brownfield start (core already validated) |

### Cumulative Quality

| Milestone | Tests | Coverage | Zero-Dep Additions |
| --------- | ----- | -------- | ------------------ |
| v1.0      | 70+   | —        | 0                  |

### Top Lessons (Verified Across Milestones)

1. Raw JSONL as source of truth enables both `convert` and `resume` without special-casing — the architecture paid for itself.
2. Auth failure should always re-throw before error-record write — mixing error-accumulation with auth errors causes confusing behavior.
