# Roadmap: meetup-exit

## Overview

The core export engine (auth, GraphQL client, export orchestration, archive writers, privacy modes) is already validated. This roadmap covers the three remaining delivery boundaries to complete the MVP: re-processing archives without re-fetching the API, hardening the export against crashes and partial failures, and shipping the operational tooling and documentation that make the tool usable by others.

## Phases

- [x] **Phase 1: Convert Command** - Re-derive CSV/Markdown from existing raw JSONL without hitting the API
- [ ] **Phase 2: Export Resilience** - Add photos export, resume on crash, and persistent error records
- [ ] **Phase 3: Ops and Docs** - Ship the doctor command, README, env example, and security guide

## Phase Details

### Phase 1: Convert Command

**Goal**: Users can transform a previously exported raw JSONL archive into fresh CSV and Markdown outputs without re-fetching the Meetup API
**Depends on**: Nothing (builds on existing archive writers)
**Requirements**: CONV-01
**Success Criteria** (what must be TRUE):

1. Running `meetup-exit convert --input <export-dir> --out <out-dir>` reads raw JSONL files and produces CSV and Markdown outputs
2. The convert output matches the format produced by a fresh `export` run on the same data
3. Privacy mode flags (`--privacy-mode`) work identically in convert as in export
4. Running convert on a directory with no raw JSONL files exits with a clear error message
   **Plans**: 1 plan

Plans:

- [x] 01-01-PLAN.md — Convert engine + CLI command (runConvert, convertCommand, main.ts registration)

### Phase 2: Export Resilience

**Goal**: The export command captures photo metadata, can resume a partial run without duplicates, and persists entity errors for audit after the export completes
**Depends on**: Phase 1
**Requirements**: PHOTO-01, RESM-01, ERR-01
**Success Criteria** (what must be TRUE):

1. A completed export includes `csv/photos.csv` with `featuredEventPhoto` URLs extracted per event
2. Running `export --resume` after a mid-export crash skips already-written entities and appends only missing records — no duplicate lines in any JSONL or CSV file
3. A failed entity fetch writes a record to `raw/errors.jsonl` and the export continues to the next entity rather than stopping
4. After export, `reports/errors.md` summarizes every entity that failed, with reason and timestamp
   **Plans**: 3 plans

Plans:

- [ ] 02-01-PLAN.md — Photos CSV: PhotoCsvRow + writePhotosCsv, wire into orchestrator and convert (PHOTO-01)
- [ ] 02-02-PLAN.md — Error records: extend ArchiveRecord, errors.jsonl, errors-report.ts, always-on reports/errors.md (ERR-01)
- [ ] 02-03-PLAN.md — Resume: resume-index module, ExportOptions.resume, per-stage gates, CSV regen via runConvert, --resume CLI flag (RESM-01)

### Phase 3: Ops and Docs

**Goal**: A new user can set up, validate, and run a full export by following the README, and can self-diagnose configuration issues with the doctor command
**Depends on**: Phase 2
**Requirements**: DIAG-01, DOC-01, DOC-02, DOC-03
**Success Criteria** (what must be TRUE):

1. Running `meetup-exit doctor` reports Bun version check, required env var presence, private key file permissions (600), and output directory writability — each as pass/fail
2. The README covers OAuth Client creation, JWT bearer configuration, a complete export example, and all privacy modes — a new user can go from zero to first export following it alone
3. `.env.example` lists every `MEETUP_*` variable with an English inline comment explaining its purpose and expected format
4. The security guide documents token handling, private key storage, full-export sensitivity, and the gitignore configuration required to avoid committing secrets
   **Plans**: TBD

## Progress

| Phase                | Plans Complete | Status      | Completed  |
| -------------------- | -------------- | ----------- | ---------- |
| 1. Convert Command   | 1/1            | Complete    | 2026-05-08 |
| 2. Export Resilience | 0/3            | Not started | -          |
| 3. Ops and Docs      | 0/?            | Not started | -          |
