import { mkdir, writeFile, readFile } from "node:fs/promises";
import { join } from "node:path";

export type ResumeEntityType = "groups" | "events" | "rsvps" | "registration-answers";

export type ResumeIndex = {
  version: 1;
  exportedAt: string;
  completedEntityTypes: ResumeEntityType[];
};

const INDEX_RELATIVE_PATH = join(".meetup-exit", "index.json");

export async function loadResumeIndex(
  outDir: string,
  fallbackStartedAt: string,
): Promise<ResumeIndex> {
  const indexPath = join(outDir, INDEX_RELATIVE_PATH);
  let text: string;
  try {
    text = await readFile(indexPath, "utf-8");
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError?.code === "ENOENT") {
      return { version: 1, exportedAt: fallbackStartedAt, completedEntityTypes: [] };
    }
    // Any other read error — return empty fallback (defensive)
    return { version: 1, exportedAt: fallbackStartedAt, completedEntityTypes: [] };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    // JSON parse failure — return empty fallback (corrupt index should not block resume)
    return { version: 1, exportedAt: fallbackStartedAt, completedEntityTypes: [] };
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !Array.isArray((parsed as Record<string, unknown>)["completedEntityTypes"])
  ) {
    return { version: 1, exportedAt: fallbackStartedAt, completedEntityTypes: [] };
  }

  return parsed as ResumeIndex;
}

export async function saveResumeIndex(outDir: string, index: ResumeIndex): Promise<void> {
  const indexDir = join(outDir, ".meetup-exit");
  await mkdir(indexDir, { recursive: true });
  await writeFile(join(indexDir, "index.json"), JSON.stringify(index, null, 2), "utf-8");
}

export function markEntityTypeComplete(index: ResumeIndex, type: ResumeEntityType): ResumeIndex {
  if (index.completedEntityTypes.includes(type)) {
    return index;
  }
  return {
    ...index,
    completedEntityTypes: [...index.completedEntityTypes, type],
  };
}
