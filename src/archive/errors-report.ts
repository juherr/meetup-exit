import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

export type ExportErrorRecord = {
  entityType: string;
  sourceId: string;
  timestamp: string;
  message: string;
};

export async function writeErrorsReport(
  outDir: string,
  errors: ExportErrorRecord[],
): Promise<void> {
  const lines: string[] = ["# Export Errors", ""];

  if (errors.length === 0) {
    lines.push("No entity errors.");
    lines.push("");
  } else {
    lines.push("| entity_type | source_id | timestamp | reason |");
    lines.push("| --- | --- | --- | --- |");
    for (const record of errors) {
      lines.push(
        `| ${record.entityType} | ${record.sourceId} | ${record.timestamp} | ${record.message} |`,
      );
    }
    lines.push("");
  }

  await mkdir(join(outDir, "reports"), { recursive: true });
  await writeFile(join(outDir, "reports/errors.md"), lines.join("\n"), "utf-8");
}
