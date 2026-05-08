import { writeCsvFile } from "./write-csv.ts";

export type RegistrationAnswerCsvRow = {
  eventId: string;
  eventTitle: string;
  question: string;
  answer: string;
};

export async function writeRegistrationAnswersCsv(
  filePath: string,
  rows: RegistrationAnswerCsvRow[],
): Promise<void> {
  await writeCsvFile(
    filePath,
    rows.map((r) => [r.eventId, r.eventTitle, r.question, r.answer]),
    ["event_id", "event_title", "question", "answer"],
  );
}
