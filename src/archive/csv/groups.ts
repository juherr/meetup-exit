import { writeCsvFile } from "./write-csv.ts";

export type GroupCsvRow = {
  groupId: string;
  name: string;
  urlname: string;
  membershipsCount: number;
};

export async function writeGroupsCsv(filePath: string, rows: GroupCsvRow[]): Promise<void> {
  await writeCsvFile(
    filePath,
    rows.map((r) => [r.groupId, r.name, r.urlname, r.membershipsCount]),
    ["group_id", "name", "urlname", "memberships_total_count"],
  );
}
