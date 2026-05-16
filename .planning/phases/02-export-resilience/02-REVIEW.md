---
status: has_findings
findings:
  critical: 0
  warning: 4
  info: 5
  total: 9
---

# Phase 02 — Export Resilience: Code Review

> Reviewed files: `src/archive/csv/index.ts`, `src/archive/csv/photos.ts`,
> `src/archive/errors-report.ts`, `src/archive/types.ts`,
> `src/cli/commands/export.ts`, `src/export/convert.ts`,
> `src/export/orchestrator.ts`, `src/export/resume-index.ts`,
> `test/archive/csv/photos.test.ts`, `test/archive/errors-report.test.ts`,
> `test/export/resume-index.test.ts`
>
> Diff base: `f81d86f62d5d88caf5167ddd6fe61b72c679f346`
>
> Note: CodeRabbit CLI service returned HTTP 500 (repo not linked to the
> authenticated org). All findings below are from manual analysis of the
> full diff and source files.

---

## Warning

### W-01 — Markdown injection in `writeErrorsReport` via unsanitized error messages

**File:** `src/archive/errors-report.ts`, line 25

Error messages are inserted verbatim into a Markdown table cell:

```ts
`| ${record.entityType} | ${record.sourceId} | ${record.timestamp} | ${record.message} |`
```

A pipe character (`|`) inside `record.message` breaks the GFM table structure.
A newline inside the message would break the file entirely.  Both can happen
with real API error payloads.  The impact is cosmetic (corrupt Markdown), not
a security issue, but the resulting file will not render correctly in any
Markdown viewer.

**Fix:** strip or escape `|` and newlines before interpolation, e.g.:

```ts
const cell = (s: string) => s.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
`| ${cell(record.entityType)} | ${cell(record.sourceId)} | ${record.timestamp} | ${cell(record.message)} |`
```

---

### W-02 — `runConvert` loads entire JSONL files into memory at once

**File:** `src/export/convert.ts`, lines 71-86

`readJsonlRecords` calls `Bun.file(filePath).text()` which reads the whole
file into a single string before splitting on `\n`.  For large exports with
tens of thousands of RSVPs or registration answers, this can exhaust the
available heap.  The generator interface is already async, so a streaming
read (e.g. `Bun.file(...).stream()` + `TextDecoderStream` + line-by-line
splitting, or Node's `readline` over `createReadStream`) would keep memory
constant regardless of file size.

This is not a correctness bug for the current scale of Meetup data, but it
conflicts with the stated design goal of handling Pro networks of any size.

---

### W-03 — `loadResumeIndex` silently swallows all non-ENOENT read errors

**File:** `src/export/resume-index.ts`, lines 27-29

```ts
// Any other read error — return empty fallback (defensive)
return { version: 1, exportedAt: fallbackStartedAt, completedEntityTypes: [] };
```

Errors such as `EACCES` (permission denied) or `EIO` (I/O error on the disk)
are silently discarded and treated as "no prior index".  When `--resume` is
passed the caller expects to continue a previous run; silently returning an
empty index means the entire export restarts from scratch without any
indication of the problem.

**Fix:** only swallow `ENOENT`; for all other errors, either re-throw or emit
a `logger.warn` (the logger is not yet in scope here — consider passing it, or
logging at the call site in `orchestrator.ts` where the error can be surfaced).

---

### W-04 — `resumeIndex` is always loaded (including I/O) even when `--resume` is false

**File:** `src/export/orchestrator.ts`, lines 113-116

```ts
let resumeIndex: ResumeIndex = await loadResumeIndex(options.outDir, startedAt);
if (!options.resume) {
  resumeIndex = { version: 1, exportedAt: startedAt, completedEntityTypes: [] };
}
```

The file is read unconditionally and the result is thrown away when
`options.resume` is `false`.  This is a minor inefficiency, but more
importantly it means a permission error on `.meetup-exit/index.json` will be
swallowed (see W-03) even on fresh non-resume runs where the index is
irrelevant.

**Fix:** guard the load behind the flag:

```ts
const resumeIndex: ResumeIndex = options.resume
  ? await loadResumeIndex(options.outDir, startedAt)
  : { version: 1, exportedAt: startedAt, completedEntityTypes: [] };
```

---

## Info

### I-01 — `runConvert` always re-runs on `--resume`, even when all stages were already complete

**File:** `src/export/orchestrator.ts`, lines 413-427

`runConvert` is called unconditionally whenever `options.resume` is `true`,
even if the resume index shows all four entity types completed and no new data
was fetched.  This means re-reading and re-writing all CSVs (and checksums and
Markdown) on every resume, potentially overwriting identical output.  Consider
checking `resumeIndex.completedEntityTypes.length > 0` or whether any new
entity stage actually ran before triggering the full convert.

---

### I-02 — `registrationAnswers` count missing from `attendeeCsvRows` dry-run log

**File:** `src/export/orchestrator.ts`, line 499 (dry-run block)

In the dry-run path the log prints `attendeeCsvRows.length` nowhere, while
`rsvpCsvRows.length` is logged.  `attendeeCsvRows` is populated alongside
RSVPs and its count would be useful symmetry for operators verifying a dry run
output.

---

### I-03 — `readJsonlRecords` casts without runtime validation (`as ArchiveRecord`)

**File:** `src/export/convert.ts`, line 84

```ts
yield JSON.parse(trimmed) as ArchiveRecord;
```

A corrupt or manually-edited JSONL line that is valid JSON but not a valid
`ArchiveRecord` will pass through silently and later cause a runtime property
access on `undefined`.  Given that the project already uses `zod` for external
validation, a lightweight `ArchiveRecord` schema (or at least a check that
`entityType` is a known string) would make `runConvert` resilient to partial
JSONL corruption.

---

### I-04 — `registrationAnswer` sourceId collision risk

**File:** `src/export/orchestrator.ts`, line 367

```ts
sourceId: `${eventId}-${answer.question}`,
```

If two registration answers for the same event share the same question text
(a plausible edge case for multi-choice questions stored as multiple rows), the
sourceId values will collide in the JSONL file.  This does not break
append-only JSONL, but it will confuse any future deduplication logic that
treats `sourceId` as unique per `(entityType, parentIds)`.  Using an answer
index or a stable hash of `(eventId, question, answer)` would avoid this.

---

### I-05 — Test for `writePhotosCsv` does not assert column order strictly

**File:** `test/archive/csv/photos.test.ts`, lines 33-38

The test uses `toContain` assertions on each data row, which would pass even
if the column order were `photo_id,event_id,base_url` rather than the
specified `event_id,photo_id,base_url`.  A stricter assertion on the full
parsed row content (e.g. comparing the split CSV fields positionally) would
guard against a future column-reorder regression.  The header assertion
(`lines[0]).toBe("event_id,photo_id,base_url")`) is strict; the data rows
should match the same strictness.

---

## Summary

| Severity | Count | Items |
| --- | --- | --- |
| Critical | 0 | — |
| Warning | 4 | W-01 W-02 W-03 W-04 |
| Info | 5 | I-01 I-02 I-03 I-04 I-05 |
| **Total** | **9** | |

The overall structure of the phase is sound: the three sub-features (photos CSV,
error records, resume) are cleanly separated, the resume-index module is purely
functional (no side-effects in `markEntityTypeComplete`), and the `finally`
block in the orchestrator correctly uses `Promise.allSettled` to close all
writers even on failure.  The items above are refinements rather than blockers.
