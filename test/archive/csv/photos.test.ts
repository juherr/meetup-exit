import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { writePhotosCsv } from "../../../src/archive/csv/photos.ts";
import type { PhotoCsvRow } from "../../../src/archive/csv/photos.ts";

describe("writePhotosCsv", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "photos-csv-test-"));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true });
  });

  it("writes header and two data rows in correct column order", async () => {
    const filePath = join(tmpDir, "photos.csv");
    const rows: PhotoCsvRow[] = [
      { eventId: "evt-1", photoId: "photo-1", baseUrl: "https://example.com/photo1.jpg" },
      { eventId: "evt-2", photoId: "photo-2", baseUrl: "https://example.com/photo2.jpg" },
    ];

    await writePhotosCsv(filePath, rows);

    const content = await readFile(filePath, "utf-8");
    const lines = content.trimEnd().split("\n");

    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe("event_id,photo_id,base_url");
    expect(lines[1]).toContain("evt-1");
    expect(lines[1]).toContain("photo-1");
    expect(lines[1]).toContain("https://example.com/photo1.jpg");
    expect(lines[2]).toContain("evt-2");
    expect(lines[2]).toContain("photo-2");
    expect(lines[2]).toContain("https://example.com/photo2.jpg");
  });

  it("writes header-only CSV when given an empty array", async () => {
    const filePath = join(tmpDir, "photos-empty.csv");

    await writePhotosCsv(filePath, []);

    const content = await readFile(filePath, "utf-8");
    const lines = content.trimEnd().split("\n");

    expect(lines).toHaveLength(1);
    expect(lines[0]).toBe("event_id,photo_id,base_url");
  });
});
