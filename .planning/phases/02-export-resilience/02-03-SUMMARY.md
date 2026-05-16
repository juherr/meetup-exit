---
phase: 02-export-resilience
plan: "03"
subsystem: export
tags: [resume, orchestrator, cli, resume-index, json, entity-type-gating]

# Dependency graph
requires:
  - phase: 02-export-resilience/02-01
    provides: photos.csv export via runConvert
  - phase: 02-export-resilience/02-02
    provides: error records + errors.md (errorsWriter, writeErrorsReport)
provides:
  - Resume index module at src/export/resume-index.ts (load/save/mark-complete)
  - --resume flag on CLI export command
  - Per-entity-type resume gating in orchestrator (groups/events/rsvps/registration-answers)
  - CSV re-derivation via runConvert on resume runs (D-06)
affects:
  - cli/commands/export.ts
  - export/orchestrator.ts

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Resume index at <outDir>/.meetup-exit/index.json (per-export, not project-level — D-04)
    - Entity-type granularity for resume checkpointing (D-07)
    - ENOENT → empty fallback for missing/corrupt index (D-08)
    - Full CSV re-derivation from JSONL on resume via runConvert (D-06)
    - Pure, idempotent markEntityTypeComplete (no mutation)
    - Use readFile (node:fs/promises) over Bun.file() for vitest compatibility

key-files:
  created:
    - src/export/resume-index.ts
    - test/export/resume-index.test.ts
  modified:
    - src/export/orchestrator.ts
    - src/cli/commands/export.ts

key-decisions:
  - "Resume index keyed by entity-type (groups/events/rsvps/registration-answers) at <outDir>/.meetup-exit/index.json — per-export scope, not project-level (D-04, D-07)"
  - "On resume, runConvert(inputDir: outDir, outDir: outDir) re-derives all CSVs from complete JSONL — guarantees no duplicate rows (D-06)"
  - "Missing or corrupt index file silently returns empty fallback — resume=true with no index behaves like fresh export (D-08)"
  - "Use readFile from node:fs/promises instead of Bun.file().text() — Bun.file() is not available in vitest's test environment (auto-fix deviation)"

patterns-established:
  - "Resume checkpoint: mark+save immediately after each stage's JSONL writes complete (not at end of entire export)"
  - "Fresh run resets resumeIndex to empty even if a stale index.json exists (options.resume guard)"

requirements-completed:
  - RESM-01

# Metrics
duration: 10min
completed: 2026-05-16
---

# Phase 02 Plan 03: Resume Export Summary

**Per-entity-type resume capability with `.meetup-exit/index.json` index, stage gating in orchestrator, and full CSV re-derivation via runConvert on resume**

## Performance

- **Duration:** 10 min
- **Started:** 2026-05-15T23:40:52Z
- **Completed:** 2026-05-16T00:01:38Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- Created `src/export/resume-index.ts` with `loadResumeIndex`, `saveResumeIndex`, `markEntityTypeComplete` — pure, idempotent, ENOENT-safe
- Wired resume index into `runExport`: loads at start, resets for fresh runs, gates 4 entity-type stages, marks+saves each after completion
- Added `--resume` CLI flag with description; passes `resume: opts.resume === true` into `runExport`
- 10 unit tests covering all required scenarios (ENOENT, round-trip, idempotency, malformed JSON fallback)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create resume-index module with unit test** - `7ddfcc4` (feat)
2. **Task 2: Wire --resume into runExport orchestrator** - `5d592ac` (feat)
3. **Task 3: Add --resume CLI flag** - `8c7ae9b` (feat)

## Files Created/Modified
- `src/export/resume-index.ts` - ResumeIndex type, loadResumeIndex (ENOENT→fallback), saveResumeIndex (mkdir+writeFile), markEntityTypeComplete (pure/idempotent)
- `test/export/resume-index.test.ts` - 10 unit tests: ENOENT, round-trip, idempotency, malformed JSON
- `src/export/orchestrator.ts` - ExportOptions.resume field, resume index load/reset, 4 entity-type gates, 4 mark+save points, runConvert branch on resume, dry-run log
- `src/cli/commands/export.ts` - resume?: true in ExportOpts, --resume option registration, resume: opts.resume === true in runExport call

## Decisions Made
- Resume index stored at `<outDir>/.meetup-exit/index.json` per-export scope (not project-level) — isolates resume state to the export directory
- Entity-type granularity (not per-event) — minimal and sufficient per D-07
- On resume, `runConvert(inputDir: outDir, outDir: outDir)` re-derives all CSVs from complete JSONL — prevents duplicate rows (D-06)
- Missing or corrupt index returns empty fallback silently — `--resume` with no index behaves like fresh export (D-08)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Replaced Bun.file().text() with readFile() for vitest compatibility**
- **Found during:** Task 1 (unit test execution)
- **Issue:** `Bun.file().text()` is a Bun-specific API not available in vite-plus's vitest environment. 3 of 10 tests failed — loadResumeIndex always returned the ENOENT fallback when tests wrote files via Node.js fs/promises, because Bun.file() threw an unrecognized error that was caught by the defensive catch block.
- **Fix:** Changed import to `readFile` from `node:fs/promises` and replaced `await Bun.file(indexPath).text()` with `await readFile(indexPath, "utf-8")`.
- **Files modified:** `src/export/resume-index.ts`
- **Verification:** All 10 tests pass after fix; `vp check` still passes
- **Committed in:** `7ddfcc4` (part of Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Essential fix for test correctness. The plan directed mirroring the Bun.file() pattern from convert.ts, but that pattern is untested and breaks in vitest. No scope creep — same behavior, compatible API.

## Issues Encountered
- vite-plus test environment does not expose Bun globals — `Bun.file()` unavailable. Fixed by switching to `readFile` from `node:fs/promises` (standard Node.js API, available in both Bun runtime and vitest).

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- RESM-01 fully satisfied: `--resume` flag operational, completed stages skipped, CSV de-duplication guaranteed via runConvert
- D-04, D-05, D-06, D-07, D-08 all honored
- Phase 02 (export-resilience) complete — all 3 plans done
- Phase 03 can proceed (privacy module, pseudonymization, GDPR report enhancements)

---
*Phase: 02-export-resilience*
*Completed: 2026-05-16*
