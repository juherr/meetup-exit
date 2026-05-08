import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { JsonlWriter } from "../../src/archive/jsonl-writer.ts";
import type { ArchiveRecord } from "../../src/archive/types.ts";

function makeRecord(overrides?: Partial<ArchiveRecord>): ArchiveRecord {
  return {
    source: "meetup",
    exportedAt: "2026-05-08T10:00:00.000Z",
    entityType: "group",
    sourceId: "g-1",
    raw: { id: "g-1", name: "Test Group" },
    ...overrides,
  };
}

describe("JsonlWriter", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "jsonl-writer-test-"));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true });
  });

  it("writes a single record as a valid JSON line", async () => {
    const filePath = join(tmpDir, "output.jsonl");
    const writer = new JsonlWriter(filePath);

    await writer.write(makeRecord({ sourceId: "g-1" }));
    await writer.close();

    const content = await readFile(filePath, "utf-8");
    const lines = content.trimEnd().split("\n");
    expect(lines).toHaveLength(1);
    const parsed = JSON.parse(lines[0]!);
    expect(parsed.sourceId).toBe("g-1");
    expect(parsed.source).toBe("meetup");
    expect(parsed.entityType).toBe("group");
  });

  it("writes multiple records as separate lines", async () => {
    const filePath = join(tmpDir, "output.jsonl");
    const writer = new JsonlWriter(filePath);

    await writer.write(makeRecord({ sourceId: "g-1" }));
    await writer.write(makeRecord({ sourceId: "g-2", entityType: "event" }));
    await writer.write(makeRecord({ sourceId: "g-3" }));
    await writer.close();

    const content = await readFile(filePath, "utf-8");
    const lines = content.trimEnd().split("\n");
    expect(lines).toHaveLength(3);
    expect(JSON.parse(lines[0]!).sourceId).toBe("g-1");
    expect(JSON.parse(lines[1]!).sourceId).toBe("g-2");
    expect(JSON.parse(lines[2]!).sourceId).toBe("g-3");
  });

  it("appends to an existing file", async () => {
    const filePath = join(tmpDir, "output.jsonl");

    const writer1 = new JsonlWriter(filePath);
    await writer1.write(makeRecord({ sourceId: "g-1" }));
    await writer1.close();

    const writer2 = new JsonlWriter(filePath);
    await writer2.write(makeRecord({ sourceId: "g-2" }));
    await writer2.close();

    const content = await readFile(filePath, "utf-8");
    const lines = content.trimEnd().split("\n");
    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[0]!).sourceId).toBe("g-1");
    expect(JSON.parse(lines[1]!).sourceId).toBe("g-2");
  });

  it("closes cleanly without writing anything", async () => {
    const writer = new JsonlWriter(join(tmpDir, "empty.jsonl"));
    await expect(writer.close()).resolves.toBeUndefined();
  });
});
