# Phase 2: Export Resilience - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-15
**Phase:** 02-export-resilience
**Areas discussed:** Photos CSV format, Resume CSV integrity, Error report behavior, Resume index scope

---

## Photos CSV Format

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal: event_id, photo_id, base_url | Just photo-specific data. Event context joinable from events.csv. | ✓ |
| Enriched: + event_title, date_time, group_id | Self-contained for bulk URL download without joining CSVs. | |
| You decide | Let Claude pick. | |

**User's choice:** Minimal columns — event_id, photo_id, base_url
**Notes:** No event context columns needed; consumers can join from events.csv if required.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Skip events with no photo | photos.csv only has rows where a photo actually exists. | ✓ |
| Include all events, empty photo fields | Every event gets a row; photo fields empty when null. | |
| You decide | Let Claude pick. | |

**User's choice:** Skip events with no photo
**Notes:** Cleaner file — absence of a row means no photo, not ambiguity about empty fields.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — convert produces photos.csv too | Keeps convert output consistent with fresh export. event-details.jsonl has the data. | ✓ |
| No — convert skips photos.csv | Photos.csv is export-only. | |

**User's choice:** Convert also produces photos.csv

---

## Resume CSV Integrity

| Option | Description | Selected |
|--------|-------------|----------|
| Regenerate from JSONL after resume | Fetch missing entities → append JSONL → regenerate all CSVs from complete JSONL (convert logic). No duplicates. | ✓ |
| Rebuild in-memory from existing JSONL + new rows | Read existing JSONL to reconstruct CSV rows for already-exported entities, merge with new. | |
| You decide | Let Claude choose. | |

**User's choice:** Regenerate from JSONL after resume
**Notes:** Leverages existing convert logic; JSONL as source of truth stays consistent with project architecture.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Append mode always + index deduplication | JSONL writers open in append mode; index is source of truth for skipping. | ✓ |
| Check JSONL content before opening | Scan existing JSONL on startup to build known entity IDs set. No index needed but adds a pre-fetch read pass. | |

**User's choice:** Append mode + index deduplication

---

| Option | Description | Selected |
|--------|-------------|----------|
| Treat as fresh export | If no index, --resume behaves as normal export. Safe fallback. | ✓ |
| Warn but continue | Log a warning, then proceed as fresh export. | |
| Exit with error | Exit code 5 if --resume but no index found. | |

**User's choice:** Treat as fresh export — no error, no warning

---

## Error Report Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Only when errors occurred | No file on clean export. Absence = clean. | |
| Always create it | Clean = "No entity errors." Consistent presence for scripting. | ✓ |

**User's choice:** Always create reports/errors.md

---

| Option | Description | Selected |
|--------|-------------|----------|
| Markdown table | entity_type \| source_id \| timestamp \| reason — easy to scan, consistent with tabular archive. | ✓ |
| Bulleted list | One bullet per failure with inline details. More human-readable, less parseable. | |

**User's choice:** Markdown table format

---

| Option | Description | Selected |
|--------|-------------|----------|
| Follow ArchiveRecord pattern | { source, exportedAt, entityType, sourceId, parentIds?, raw: {error…} } — consistent with all other JSONL. | ✓ |
| Flat ErrorRecord type | { entityType, sourceId, failedAt, reason } — simpler but a different pattern. | |

**User's choice:** ArchiveRecord pattern for errors.jsonl

---

## Resume Index Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Inside output dir: \<outDir\>/.meetup-exit/index.json | Scoped to specific export. Each export dir has its own resume state. | ✓ |
| Project-level: .meetup-exit/index.json | Shared across all exports. Matches CLAUDE.md spec literally but confuses multiple --out directories. | |

**User's choice:** Index inside output dir — `<outDir>/.meetup-exit/index.json`

---

| Option | Description | Selected |
|--------|-------------|----------|
| After each entity type completes | Index flushed after groups-done, events-done, etc. Simpler, minimal disk writes. | ✓ |
| After each entity (per record) | Maximum granularity — can resume mid-event-list. More disk writes. | |

**User's choice:** After each entity type completes

---

## Claude's Discretion

- Exact JSON structure of `.meetup-exit/index.json`
- How to detect prior partial run (path construction, index JSON parsing)
- Whether `convert` re-derives photos.csv via a new `writePhotosCsv()` function or inline logic

## Deferred Ideas

None — discussion stayed within phase scope.
