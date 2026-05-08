import { writeCsvFile } from "./write-csv.ts";

export type RsvpCsvRow = {
  eventId: string;
  rsvpId: string;
  memberId: string;
  memberName: string;
  memberEmail: string | null;
};

export async function writeRsvpsCsv(filePath: string, rows: RsvpCsvRow[]): Promise<void> {
  await writeCsvFile(
    filePath,
    rows.map((r) => [r.eventId, r.rsvpId, r.memberId, r.memberName, r.memberEmail ?? ""]),
    ["event_id", "rsvp_id", "member_id", "member_name", "member_email"],
  );
}
