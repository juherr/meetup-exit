import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { fileChecksum, writeChecksums } from "../../src/archive/checksums.ts";

function tmpDir(): string {
  return join(tmpdir(), `meetup-exit-test-${randomBytes(4).toString("hex")}`);
}

describe("writeChecksums", () => {
  it("writes sha256 checksums for files in raw/ and csv/", async () => {
    const dir = tmpDir();
    await mkdir(join(dir, "raw"), { recursive: true });
    await mkdir(join(dir, "csv"), { recursive: true });

    const content1 = "hello world";
    const content2 = "groups,events\n1,100";
    await writeFile(join(dir, "raw/groups.jsonl"), content1, "utf-8");
    await writeFile(join(dir, "csv/groups.csv"), content2, "utf-8");

    await writeChecksums(dir);

    const checksumFile = await readFile(join(dir, "checksums/sha256.txt"), "utf-8");
    const hash1 = createHash("sha256").update(content1).digest("hex");
    const hash2 = createHash("sha256").update(content2).digest("hex");

    expect(checksumFile).toContain(`${hash1}  raw/groups.jsonl`);
    expect(checksumFile).toContain(`${hash2}  csv/groups.csv`);
  });

  it("skips missing subdirectories without error", async () => {
    const dir = tmpDir();
    await mkdir(dir, { recursive: true });

    await expect(writeChecksums(dir)).resolves.toBeUndefined();
  });

  it("entries are sorted by path", async () => {
    const dir = tmpDir();
    await mkdir(join(dir, "raw"), { recursive: true });
    await writeFile(join(dir, "raw/z.jsonl"), "z");
    await writeFile(join(dir, "raw/a.jsonl"), "a");

    await writeChecksums(dir);

    const lines = (await readFile(join(dir, "checksums/sha256.txt"), "utf-8")).trim().split("\n");
    expect(lines[0]).toContain("raw/a.jsonl");
    expect(lines[1]).toContain("raw/z.jsonl");
  });
});

describe("fileChecksum", () => {
  it("returns sha256: prefix + hex hash for existing file", async () => {
    const dir = tmpDir();
    await mkdir(dir, { recursive: true });
    const content = "test content";
    const filePath = join(dir, "test.json");
    await writeFile(filePath, content, "utf-8");

    const result = await fileChecksum(filePath);
    const expected = "sha256:" + createHash("sha256").update(content).digest("hex");
    expect(result).toBe(expected);
  });

  it("returns undefined for missing file", async () => {
    const result = await fileChecksum("/nonexistent/path/file.json");
    expect(result).toBeUndefined();
  });
});
