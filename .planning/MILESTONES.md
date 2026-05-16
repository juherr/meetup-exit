# Milestones

## v1.0 MVP (Shipped: 2026-05-16)

**Phases completed:** 3 phases, 6 plans, 12 tasks

**Key accomplishments:**

- API-free convert engine that reads raw JSONL archives and re-derives CSV/Markdown with configurable privacy modes, mirroring the export orchestrator exactly
- Three-column `csv/photos.csv` (event_id, photo_id, base_url) wired into both `export` and `convert` via new `writePhotosCsv` writer
- Error persistence added to runExport: raw/errors.jsonl via ArchiveRecord-conformant records and reports/errors.md always written on every non-dry-run export
- Per-entity-type resume capability with `.meetup-exit/index.json` index, stage gating in orchestrator, and full CSV re-derivation via runConvert on resume
- Auth-mode aware local config validator — checks Bun version, env vars, private key permissions (600), and output dir writability with no network calls and no secret value exposure
- README rewritten as user-facing setup guide with all 6 commands, full export example, privacy modes, and links to new SECURITY.md covering ephemeral pseudonymization salt, private key permissions, and gitignore config

---
