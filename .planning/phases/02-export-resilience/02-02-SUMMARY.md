---
phase: 02-export-resilience
plan: "02"
subsystem: archive
tags: [jsonl, markdown, error-handling, resilience]

requires:
  - phase: 02-01
    provides: photos CSV export and ArchiveRecord infrastructure reused for error records

provides:
  - ExportErrorRecord type and writeErrorsReport function in src/archive/errors-report.ts
  - "error" literal in ArchiveRecord.entityType union (src/archive/types.ts)
  - raw/errors.jsonl written by errorsWriter on every entity failure (non-dry-run)
  - reports/errors.md always written after every non-dry-run export (empty or with table)

affects:
  - 02-03-PLAN.md
  - any future phase consuming orchestrator output or archive format

tech-stack:
  added: []
  patterns:
    - "Report writer pattern: mirror writeGdprReport — mkdir(reports/) then writeFile with lines.join(\\n)"
    - "Error accumulation: in-memory ExportErrorRecord[] collected during catch blocks, flushed at export end"
    - "Error JSONL: entityType: error with raw: { error, message, timestamp } — ArchiveRecord-conformant"

key-files:
  created:
    - src/archive/errors-report.ts
    - test/archive/errors-report.test.ts
  modified:
    - src/archive/types.ts
    - src/export/orchestrator.ts

key-decisions:
  - "writeErrorsReport called after Promise.all([writeManifest, writeGdprReport]) as a separate post-step to make ordering explicit and easy to extend"
  - "errorRecords accumulator always populated (even in dry-run) but errorsWriter.write() skipped in dry-run — report is in-memory, JSONL is filesystem"
  - "Dry-run log updated to reflect both error record count and reports/errors.md as would-be writes (D-10)"

patterns-established:
  - "Error catch blocks: auth re-throw first, then logger.warn + counts.errors++, then error-record write (non-dry-run) + errorRecords.push (always)"

requirements-completed:
  - ERR-01

duration: 2min
completed: 2026-05-16
---

# Phase 02 Plan 02: Error Records and errors.md Summary

**Error persistence added to runExport: raw/errors.jsonl via ArchiveRecord-conformant records and reports/errors.md always written on every non-dry-run export**

## Performance

- **Duration:** 2min
- **Started:** 2026-05-15T22:38:53Z
- **Completed:** 2026-05-15T22:41:30Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Extended `ArchiveRecord.entityType` union with `"error"` literal — zero type errors propagating to existing writers
- Created `src/archive/errors-report.ts` exporting `ExportErrorRecord` and `writeErrorsReport` — mirrors `writeGdprReport` pattern exactly
- Wired three catch blocks in `runExport` (event-details, rsvps, registration-answers) to write error records to `raw/errors.jsonl` and push to in-memory accumulator
- `reports/errors.md` always written at end of every non-dry-run export: `No entity errors.` when clean, markdown table with `| entity_type | source_id | timestamp | reason |` header when failures occurred
- Auth failures (`AuthenticationError`/`AuthorizationError`) still re-throw before error-record write — entity error policy unchanged
- Dry-run mode logs error record count and mentions `reports/errors.md` as would-be write without touching filesystem

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend ArchiveRecord type and add writeErrorsReport with unit test** - `5420fd3` (feat)
2. **Task 2: Wire error records into runExport (orchestrator) at all three catch blocks** - `d2c907e` (feat)

**Plan metadata:** committed with docs commit

## Files Created/Modified

- `src/archive/types.ts` - Added `"error"` literal to `entityType` union
- `src/archive/errors-report.ts` - New: `ExportErrorRecord` type + `writeErrorsReport` function producing `reports/errors.md`
- `test/archive/errors-report.test.ts` - New: unit tests covering empty-errors and with-errors cases
- `src/export/orchestrator.ts` - Wired `errorsWriter`, `errorRecords`, three catch blocks, `writeErrorsReport` call, dry-run log updates

## Decisions Made

- `writeErrorsReport` called as a separate `await` after `Promise.all([writeManifest, writeGdprReport])` rather than inside the `Promise.all` — makes ordering explicit and easy to extend
- `errorRecords` accumulator populated even in dry-run (since it is in-memory), but `errorsWriter.write()` guarded by `!options.dryRun` — JSONL file never created in dry-run
- `entityType` in error records pushed to `errorRecords` uses the original entity type (`"event-details"`, `"rsvp"`, `"registration-answer"`) while `entityType: "error"` is used in the JSONL `ArchiveRecord` — distinguishes archive record type from logical error source

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Formatter (oxfmt) reformatted `src/archive/errors-report.ts` and `test/archive/errors-report.test.ts` during `vp check --fix` — long lines broken across multiple lines. Fixed with `vp check --fix` before committing. No logic changes.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- ERR-01 satisfied: entity errors persisted to `raw/errors.jsonl` and `reports/errors.md`, export continues on entity errors, exit code 4 preserved
- `src/archive/errors-report.ts` available as reusable module for any future phase that needs structured error reporting
- No regressions: all 66 tests pass, `vp check` clean

---
*Phase: 02-export-resilience*
*Completed: 2026-05-16*
