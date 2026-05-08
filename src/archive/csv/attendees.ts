import { writeCsvFile } from "./write-csv.ts";

export type AttendeeCsvRow = {
  memberEmail: string | null;
  memberName: string;
  eventId: string;
  eventTitle: string;
  eventDateTime: string;
  rsvpId: string;
};

export async function writeAttendeesCsv(filePath: string, rows: AttendeeCsvRow[]): Promise<void> {
  await writeCsvFile(
    filePath,
    rows.map((r) => [
      r.memberEmail ?? "",
      r.memberName,
      r.eventId,
      r.eventTitle,
      r.eventDateTime,
      r.rsvpId,
    ]),
    ["member_email", "member_name", "event_id", "event_title", "event_date_time", "rsvp_id"],
  );
}
