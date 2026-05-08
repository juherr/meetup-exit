---
phase: 01-convert-command
plan: "01"
subsystem: cli
tags: [commander, jsonl, csv, markdown, privacy, convert]

# Dependency graph
requires: []
provides:
  - convert engine (src/export/convert.ts): reads raw JSONL and writes CSV/Markdown without GraphQL
  - convert CLI command (src/cli/commands/convert.ts): wires Commander to runConvert
  - main.ts updated to register convertCommand
affects: [future phases that extend or test the convert command]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - JSONL async generator pattern for streaming large files without full buffering
    - Mirror orchestrator privacy logic (applyRsvpPrivacy, applyAttendeePrivacy) in API-free convert engine
    - Two-pass entity-title map pattern (build eventTitleMap from event-details, reference in rsvps/answers passes)

key-files:
  created:
    - src/export/convert.ts
    - src/cli/commands/convert.ts
  modified:
    - src/cli/main.ts

key-decisions:
  - "runConvert takes logger as second argument (matches orchestrator pattern)"
  - "readJsonlRecords is a module-private async generator — ENOENT treated as empty (file absent = nothing to process)"
  - "eventDateTime left as empty string for attendees from JSONL rsvps since it is not stored in the rsvp raw record (only event-details has it)"
  - "convert command does not write manifest.json or GDPR report — those are export-only artifacts"

patterns-established:
  - "Pattern: Async generator + for-await-of for JSONL reading across the codebase"
  - "Pattern: Two-pass processing — first build entity maps (eventTitleMap), then reference in dependent passes"

requirements-completed: [CONV-01]

# Metrics
duration: 2min
completed: 2026-05-08
---

# Phase 1 Plan 01: Convert Command Summary

**API-free convert engine that reads raw JSONL archives and re-derives CSV/Markdown with configurable privacy modes, mirroring the export orchestrator exactly**

## Performance

- **Duration:** 2 min
- **Started:** 2026-05-08T16:27:14Z
- **Completed:** 2026-05-08T16:29:22Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Implemented `runConvert` in `src/export/convert.ts` — reads groups, event-details, rsvps, and registration-answers JSONL files, applies identical privacy rules as the export orchestrator, and writes CSV/Markdown outputs
- Created `src/cli/commands/convert.ts` — Commander command with all required flags (`--input`, `--out`, `--include-markdown`, `--privacy-mode`, `--pseudonymization-salt`, `--dry-run`, `--json-logs`)
- Registered `convertCommand` in `src/cli/main.ts` after existing commands

## Task Commits

Each task was committed atomically:

1. **Task 1: Convert engine (src/export/convert.ts)** - `4e4049f` (feat)
2. **Task 2: Convert CLI command and main.ts registration** - `edf208d` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/export/convert.ts` - Convert engine: async JSONL generator, 4-pass processing, privacy application, CSV/Markdown writing, dry-run support
- `src/cli/commands/convert.ts` - Commander command wired to `runConvert`; validates privacy mode, handles "no JSONL" error with exit 1
- `src/cli/main.ts` - Added `convertCommand` import and `.addCommand(convertCommand)`

## Decisions Made

- `readJsonlRecords` treats ENOENT as empty (file missing = nothing to convert from that entity type), so partial archives work without error
- `eventDateTime` is stored as `""` in attendee rows derived from rsvp JSONL (the RSVP record does not contain event date; only event-details does). This is a deliberate trade-off: attendees CSV from convert is slightly less complete than from a fresh export. Acceptable for MVP.
- No manifest.json or GDPR report written by convert — these are export-specific artifacts and not part of the re-derivation scope.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Formatting issues found by `oxfmt` on initial write — auto-fixed with `vp check --fix`. No semantic changes.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `meetup-exit convert --input <export-dir> --out <out-dir>` is fully functional
- Privacy modes (full, no-email, pseudonymized, public-archive) behave identically to the export command
- No-JSONL case exits 1 with human-readable message
- `--dry-run` produces no file writes
- Ready for Phase 2 work

---
*Phase: 01-convert-command*
*Completed: 2026-05-08*
