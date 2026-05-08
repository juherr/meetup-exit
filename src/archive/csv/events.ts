import { writeCsvFile } from "./write-csv.ts";

export type EventCsvRow = {
  eventId: string;
  groupId: string;
  groupName: string;
  groupUrlname: string;
  title: string;
  eventUrl: string;
  dateTime: string;
  duration: string;
  hostNames: string;
  hostMemberIds: string;
  featuredPhotoId: string;
  featuredPhotoBaseUrl: string;
};

export async function writeEventsCsv(filePath: string, rows: EventCsvRow[]): Promise<void> {
  await writeCsvFile(
    filePath,
    rows.map((r) => [
      r.eventId,
      r.groupId,
      r.groupName,
      r.groupUrlname,
      r.title,
      r.eventUrl,
      r.dateTime,
      r.duration,
      r.hostNames,
      r.hostMemberIds,
      r.featuredPhotoId,
      r.featuredPhotoBaseUrl,
    ]),
    [
      "event_id",
      "group_id",
      "group_name",
      "group_urlname",
      "title",
      "event_url",
      "date_time",
      "duration",
      "host_names",
      "host_member_ids",
      "featured_photo_id",
      "featured_photo_base_url",
    ],
  );
}
