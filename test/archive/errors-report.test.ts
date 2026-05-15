import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { writeErrorsReport } from "../../src/archive/errors-report.ts";
import type { ExportErrorRecord } from "../../src/archive/errors-report.ts";

describe("writeErrorsReport", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "errors-report-test-"));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true });
  });

  it("writes reports/errors.md with 'No entity errors.' when errors array is empty", async () => {
    await writeErrorsReport(tmpDir, []);

    const filePath = join(tmpDir, "reports/errors.md");
    const content = await readFile(filePath, "utf-8");

    expect(content).toContain("# Export Errors");
    expect(content).toContain("No entity errors.");
    expect(content).not.toContain("| entity_type |");
  });

  it("writes reports/errors.md with a markdown table when errors are present", async () => {
    const errors: ExportErrorRecord[] = [
      {
        entityType: "event-details",
        sourceId: "event-123",
        timestamp: "2026-05-15T10:00:00.000Z",
        message: "Network timeout",
      },
      {
        entityType: "rsvp",
        sourceId: "event-456",
        timestamp: "2026-05-15T10:05:00.000Z",
        message: "Internal server error",
      },
    ];

    await writeErrorsReport(tmpDir, errors);

    const filePath = join(tmpDir, "reports/errors.md");
    const content = await readFile(filePath, "utf-8");

    expect(content).toContain("# Export Errors");
    expect(content).toContain("| entity_type | source_id | timestamp | reason |");
    expect(content).toContain("| --- | --- | --- | --- |");
    expect(content).toContain(
      "| event-details | event-123 | 2026-05-15T10:00:00.000Z | Network timeout |",
    );
    expect(content).toContain(
      "| rsvp | event-456 | 2026-05-15T10:05:00.000Z | Internal server error |",
    );
    expect(content).not.toContain("No entity errors.");
  });
});
