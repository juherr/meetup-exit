import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { writeGdprReport } from "../../src/privacy/report.ts";
import type { GdprReportInput } from "../../src/privacy/report.ts";

function tmpDir(): string {
  return join(tmpdir(), `meetup-exit-test-${randomBytes(4).toString("hex")}`);
}

const baseInput: GdprReportInput = {
  privacyMode: "full",
  includes: {
    groups: true,
    events: true,
    rsvps: true,
    registrationAnswers: false,
    markdown: false,
  },
  counts: {
    groups: 1,
    events: 10,
    rsvps: 50,
    registrationAnswers: 0,
    errors: 0,
  },
};

describe("writeGdprReport", () => {
  it("creates reports/gdpr-review.md", async () => {
    const dir = tmpDir();
    await mkdir(dir, { recursive: true });

    await writeGdprReport(dir, baseInput);

    const content = await readFile(join(dir, "reports/gdpr-review.md"), "utf-8");
    expect(content).toContain("# GDPR Review");
    expect(content).toContain("## Private files");
    expect(content).toContain("## Recommendations");
  });

  it("lists private files when RSVPs included in full mode", async () => {
    const dir = tmpDir();
    await mkdir(dir, { recursive: true });

    await writeGdprReport(dir, baseInput);

    const content = await readFile(join(dir, "reports/gdpr-review.md"), "utf-8");
    expect(content).toContain("raw/rsvps.jsonl");
    expect(content).toContain("csv/rsvps.csv");
    expect(content).toContain("csv/attendees.csv");
  });

  it("no private files when public-archive mode", async () => {
    const dir = tmpDir();
    await mkdir(dir, { recursive: true });

    await writeGdprReport(dir, { ...baseInput, privacyMode: "public-archive" });

    const content = await readFile(join(dir, "reports/gdpr-review.md"), "utf-8");
    expect(content).toContain("None — no private data was exported.");
    expect(content).not.toContain("raw/rsvps.jsonl");
  });

  it("mentions salt warning for pseudonymized mode", async () => {
    const dir = tmpDir();
    await mkdir(dir, { recursive: true });

    await writeGdprReport(dir, { ...baseInput, privacyMode: "pseudonymized" });

    const content = await readFile(join(dir, "reports/gdpr-review.md"), "utf-8");
    expect(content).toContain("pseudonymization salt secret");
  });

  it("lists registration-answers as private when present", async () => {
    const dir = tmpDir();
    await mkdir(dir, { recursive: true });

    await writeGdprReport(dir, {
      ...baseInput,
      includes: { ...baseInput.includes, registrationAnswers: true },
      counts: { ...baseInput.counts, registrationAnswers: 5 },
    });

    const content = await readFile(join(dir, "reports/gdpr-review.md"), "utf-8");
    expect(content).toContain("raw/registration-answers.jsonl");
    expect(content).toContain("csv/registration-answers.csv");
  });
});
