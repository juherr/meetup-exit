export type ArchiveRecord = {
  source: "meetup";
  exportedAt: string;
  entityType: "group" | "event" | "event-details" | "rsvp" | "registration-answer" | "error";
  sourceId: string;
  parentIds?: Record<string, string>;
  raw: unknown;
};
