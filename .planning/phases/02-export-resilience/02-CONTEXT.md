# Phase 2: Export Resilience - Context

**Gathered:** 2026-05-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Add three capabilities to the `export` command: a dedicated `csv/photos.csv` output, crash recovery via `--resume` (no duplicate records, no re-fetching already-exported entities), and persistent error records (`raw/errors.jsonl` + `reports/errors.md`) for entities that failed during export.

The `convert` command must also be updated to produce `photos.csv` from existing JSONL.

</domain>

<decisions>
## Implementation Decisions

### Photos CSV (PHOTO-01)

- **D-01:** `csv/photos.csv` columns are minimal: `event_id`, `photo_id`, `base_url`. No event context columns (title, date, group_id) — consumers can join from `events.csv`.
- **D-02:** Events with no `featuredEventPhoto` (null) are skipped entirely. No empty rows. The file may be absent or empty if no events have photos.
- **D-03:** The `convert` command must also produce `photos.csv` from `event-details.jsonl` (which already contains `featuredEventPhoto` data). Convert output must match fresh export output.

### Resume (RESM-01)

- **D-04:** Resume index lives at `<outDir>/.meetup-exit/index.json` — inside the output directory, scoped to that specific export. Not at project-level `.meetup-exit/index.json`. This avoids confusion when exporting to different `--out` directories.
- **D-05:** JSONL writers always open in append mode. The index is the sole source of truth for deduplication — entities present in the index are skipped before fetching or writing, regardless of JSONL content.
- **D-06:** On `--resume`, after fetching all missing entities and appending to JSONL, **regenerate all CSV files from the complete JSONL** (reusing the convert logic). This guarantees no duplicate rows and no need to reconstruct in-memory state. CSVs are always a full re-derivation of the JSONL.
- **D-07:** Resume index is updated **after each entity type completes** (not per-record). Granularity: groups-done, events-done, rsvps-done, registration-answers-done. A crash mid-event-list means all events re-fetch on the next resume run.
- **D-08:** If `--resume` is passed but no index file exists in the output dir, treat as a fresh export — no error, no warning.

### Error Records (ERR-01)

- **D-09:** `raw/errors.jsonl` follows the existing `ArchiveRecord` pattern: `{ source: "meetup", exportedAt, entityType, sourceId, parentIds?, raw: { error, message, timestamp } }`. Consistent with all other JSONL files; convert can scan it.
- **D-10:** `reports/errors.md` is **always created** on every export (not only when errors occur). On a clean run: shows "No entity errors." On a run with failures: markdown table with columns `entity_type | source_id | timestamp | reason`.
- **D-11:** Error behavior unchanged: one entity failure → write error record + continue; auth failure → stop immediately. Exit code 4 when `counts.errors > 0`.

### Claude's Discretion

- How to detect the current export has a prior partial run (path construction, JSON parsing of index file).
- Exact JSON structure of `.meetup-exit/index.json` (sets of already-completed entity types and their IDs).
- Whether `convert` re-derives photos.csv via a new `writePhotosCsv()` function or inline logic.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Roadmap and Requirements
- `.planning/ROADMAP.md` — Phase 2 goal, requirements (PHOTO-01, RESM-01, ERR-01), success criteria
- `.planning/REQUIREMENTS.md` — Full requirement definitions and traceability

### Architecture
- `.planning/codebase/ARCHITECTURE.md` — Module boundaries, export flow, error handling patterns
- `.planning/codebase/CONCERNS.md` — Known issues: resume gap, missing error records, in-memory CSV buffer risk

### Existing Source Files (read before touching)
- `src/export/orchestrator.ts` — Main export flow; entity catch blocks that need error record writes; in-memory CSV accumulation pattern
- `src/export/convert.ts` — Convert logic to reuse for CSV regeneration on resume
- `src/archive/csv/events.ts` — EventCsvRow pattern; model for new PhotoCsvRow type
- `src/archive/csv/index.ts` — CSV writer exports; new writePhotosCsv must be added here
- `src/archive/jsonl-writer.ts` — JsonlWriter used for errors.jsonl
- `src/meetup/functions/get-event-details.ts` — Already fetches `featuredEventPhoto { id, baseUrl }`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `JsonlWriter` (`src/archive/jsonl-writer.ts`): append-only JSONL writer — reuse for `raw/errors.jsonl`. Already used for all other entity types.
- `writeCsvFile()` (`src/archive/csv/write-csv.ts`): generic CSV writer — reuse for `csv/photos.csv` via a new `writePhotosCsv()` function.
- `runConvert()` (`src/export/convert.ts`): reads JSONL, re-derives CSVs — reuse or adapt for CSV regeneration step on `--resume`.
- `ArchiveRecord` type (`src/archive/types.ts`): error records follow this exact shape with `raw: { error, message, timestamp }`.

### Established Patterns
- Entity-specific CSV writers: each entity type has its own `XxxCsvRow` type + `writeXxxCsv()` function in `src/archive/csv/`. Photos CSV follows this same pattern.
- Error catch blocks in `src/export/orchestrator.ts` at lines 214–221, 269–276, 307–314: currently just log + `counts.errors++`. These are the exact spots to add error record writes.
- Export flow is sequential: groups → events (list + details) → rsvps → registration-answers. Resume index tracks completion per entity-type in this order.

### Integration Points
- `ExportOptions` type needs a `resume: boolean` field.
- `runExport()` needs to accept resume flag, load index from `<outDir>/.meetup-exit/index.json`, and call CSV regeneration at the end when resume is active.
- `runConvert()` must be extended to also produce `photos.csv` from `event-details.jsonl`.
- `reports/errors.md` is written in the same place as `reports/gdpr-review.md` — inside the existing `!options.dryRun` write block at the end of `runExport()`.

</code_context>

<specifics>
## Specific Ideas

- The `csv/photos.csv` format mirrors the existing minimal CSV pattern: typed row + generic `writeCsvFile()`. No event context columns — just `event_id, photo_id, base_url`.
- `reports/errors.md` heading: "# Export Errors" with a table `| entity_type | source_id | timestamp | reason |` — matches the existing `reports/gdpr-review.md` markdown style.
- Resume index JSON shape (Claude's discretion): likely `{ completedEntityTypes: string[], entityIds: Record<string, string[]> }` or similar — exact structure is an implementation choice.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 02-export-resilience*
*Context gathered: 2026-05-15*
