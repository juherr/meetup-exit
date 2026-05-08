import { createHash } from "node:crypto";
import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { join, relative } from "node:path";

async function sha256Hex(filePath: string): Promise<string> {
  const data = await readFile(filePath);
  return createHash("sha256").update(data).digest("hex");
}

export async function fileChecksum(filePath: string): Promise<string | undefined> {
  try {
    return "sha256:" + (await sha256Hex(filePath));
  } catch {
    return undefined;
  }
}

async function collectFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return files;
  }
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(fullPath)));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files;
}

export async function writeChecksums(outDir: string): Promise<void> {
  const subdirs = ["raw", "csv", "markdown", "schema"];
  const allFiles: string[] = [];
  for (const subdir of subdirs) {
    allFiles.push(...(await collectFiles(join(outDir, subdir))));
  }
  allFiles.sort();

  const lines = await Promise.all(
    allFiles.map(async (filePath) => {
      const hash = await sha256Hex(filePath);
      return `${hash}  ${relative(outDir, filePath)}`;
    }),
  );

  await mkdir(join(outDir, "checksums"), { recursive: true });
  await writeFile(
    join(outDir, "checksums/sha256.txt"),
    lines.length > 0 ? lines.join("\n") + "\n" : "",
    "utf-8",
  );
}
