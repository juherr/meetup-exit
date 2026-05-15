import { writeCsvFile } from "./write-csv.ts";

export type PhotoCsvRow = {
  eventId: string;
  photoId: string;
  baseUrl: string;
};

export async function writePhotosCsv(filePath: string, rows: PhotoCsvRow[]): Promise<void> {
  await writeCsvFile(
    filePath,
    rows.map((r) => [r.eventId, r.photoId, r.baseUrl]),
    ["event_id", "photo_id", "base_url"],
  );
}
