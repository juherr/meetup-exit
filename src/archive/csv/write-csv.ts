import { writeFile } from "node:fs/promises";
import { stringify } from "csv-stringify/sync";

export async function writeCsvFile(
  filePath: string,
  data: unknown[][],
  columns: string[],
): Promise<void> {
  const content = stringify(data, { header: true, columns });
  await writeFile(filePath, content, "utf-8");
}
