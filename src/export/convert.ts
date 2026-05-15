import { mkdir, access } from "node:fs/promises";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import type { Logger } from "../logging/index.ts";
import type { ArchiveRecord } from "../archive/types.ts";
import {
  writeGroupsCsv,
  writeEventsCsv,
  writePhotosCsv,
  writeRsvpsCsv,
  writeAttendeesCsv,
  writeRegistrationAnswersCsv,
} from "../archive/csv/index.ts";
import type {
  GroupCsvRow,
  EventCsvRow,
  PhotoCsvRow,
  RsvpCsvRow,
  AttendeeCsvRow,
  RegistrationAnswerCsvRow,
} from "../archive/csv/index.ts";
import { writeEventMarkdown } from "../archive/markdown/index.ts";
import { writeChecksums } from "../archive/checksums.ts";
import {
  PRIVACY_MODES,
  applyRsvpPrivacy,
  applyAttendeePrivacy,
  stableHash,
  PSEUDONYM_PREFIXES,
} from "../privacy/index.ts";
import type { PrivacyMode } from "../privacy/index.ts";
import type { EventDetails } from "../meetup/functions/get-event-details.ts";

export { PRIVACY_MODES };
export type { PrivacyMode };

export type ConvertOptions = {
  inputDir: string;
  outDir: string;
  includeMarkdown: boolean;
  privacyMode: PrivacyMode;
  pseudonymizationSalt?: string;
  dryRun: boolean;
};

export type ConvertCounts = {
  groups: number;
  events: number;
  rsvps: number;
  registrationAnswers: number;
  errors: number;
};

const KNOWN_JSONL_FILES = [
  "raw/groups.jsonl",
  "raw/event-details.jsonl",
  "raw/rsvps.jsonl",
  "raw/registration-answers.jsonl",
] as const;

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function* readJsonlRecords(filePath: string): AsyncGenerator<ArchiveRecord> {
  let text: string;
  try {
    text = await Bun.file(filePath).text();
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError?.code === "ENOENT") {
      return;
    }
    throw error;
  }
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    yield JSON.parse(trimmed) as ArchiveRecord;
  }
}

export async function runConvert(options: ConvertOptions, logger: Logger): Promise<ConvertCounts> {
  const rawDir = join(options.inputDir, "raw");

  // Check at least one known JSONL file exists
  const existChecks = await Promise.all(
    KNOWN_JSONL_FILES.map((f) => fileExists(join(options.inputDir, f))),
  );
  if (!existChecks.some(Boolean)) {
    throw new Error(`No raw JSONL files found in ${options.inputDir}/raw — nothing to convert`);
  }

  let effectiveSalt = options.pseudonymizationSalt;
  if (options.privacyMode === "pseudonymized" && !effectiveSalt) {
    effectiveSalt = randomBytes(32).toString("hex");
    logger.warn(
      `no --pseudonymization-salt provided; using random salt for this run: ${effectiveSalt}`,
    );
    logger.warn("pass --pseudonymization-salt to produce consistent pseudonyms across exports");
  }

  const counts: ConvertCounts = {
    groups: 0,
    events: 0,
    rsvps: 0,
    registrationAnswers: 0,
    errors: 0,
  };

  const markdownEventsDir = join(options.outDir, "markdown", "events");

  if (!options.dryRun) {
    await mkdir(join(options.outDir, "csv"), { recursive: true });
    if (options.includeMarkdown) {
      await mkdir(markdownEventsDir, { recursive: true });
    }
  }

  const groupCsvRows: GroupCsvRow[] = [];
  const eventCsvRows: EventCsvRow[] = [];
  const photoCsvRows: PhotoCsvRow[] = [];
  const rsvpCsvRows: RsvpCsvRow[] = [];
  const attendeeCsvRows: AttendeeCsvRow[] = [];
  const answerCsvRows: RegistrationAnswerCsvRow[] = [];

  // Pass 1: groups
  for await (const record of readJsonlRecords(join(rawDir, "groups.jsonl"))) {
    if (record.entityType !== "group") continue;
    const raw = record.raw as Record<string, unknown>;
    groupCsvRows.push({
      groupId: (raw["id"] as string) ?? "",
      name: (raw["name"] as string) ?? "",
      urlname: (raw["urlname"] as string) ?? "",
      membershipsCount: (raw["membershipCount"] as number) ?? 0,
    });
    counts.groups++;
  }

  // Pass 2: event-details + optional markdown
  const eventTitleMap = new Map<string, string>();

  for await (const record of readJsonlRecords(join(rawDir, "event-details.jsonl"))) {
    if (record.entityType !== "event-details") continue;
    const raw = record.raw as Record<string, unknown>;

    const id = (raw["id"] as string) ?? "";
    const title = (raw["title"] as string) ?? "";
    const eventUrl = (raw["eventUrl"] as string) ?? "";
    const dateTime = (raw["dateTime"] as string) ?? "";
    const duration = (raw["duration"] as string) ?? "";
    const description = (raw["description"] as string) ?? "";

    const groupRaw = (raw["group"] as Record<string, unknown> | null) ?? null;
    const groupId = groupRaw ? ((groupRaw["id"] as string) ?? "") : "";
    const groupName = groupRaw ? ((groupRaw["name"] as string) ?? "") : "";
    const groupUrlname = groupRaw ? ((groupRaw["urlname"] as string) ?? "") : "";

    const hostsRaw = (raw["eventHosts"] as Array<Record<string, unknown>>) ?? [];
    const eventHosts = hostsRaw.map((h) => ({
      memberId: (h["memberId"] as string) ?? "",
      name: (h["name"] as string) ?? "",
    }));

    const photoRaw = (raw["featuredEventPhoto"] as Record<string, unknown> | null) ?? null;
    const featuredEventPhoto = photoRaw
      ? {
          id: (photoRaw["id"] as string) ?? "",
          baseUrl: (photoRaw["baseUrl"] as string) ?? "",
        }
      : null;

    eventTitleMap.set(id, title);

    eventCsvRows.push({
      eventId: id,
      groupId,
      groupName,
      groupUrlname,
      title,
      eventUrl,
      dateTime,
      duration,
      hostNames: eventHosts.map((h) => h.name).join("|"),
      hostMemberIds: eventHosts.map((h) => h.memberId).join("|"),
      featuredPhotoId: featuredEventPhoto?.id ?? "",
      featuredPhotoBaseUrl: featuredEventPhoto?.baseUrl ?? "",
    });

    if (featuredEventPhoto !== null) {
      photoCsvRows.push({
        eventId: id,
        photoId: featuredEventPhoto.id,
        baseUrl: featuredEventPhoto.baseUrl,
      });
    }

    if (options.includeMarkdown && !options.dryRun) {
      const eventDetails: EventDetails = {
        id,
        title,
        eventUrl,
        description,
        dateTime,
        duration,
        eventHosts,
        featuredEventPhoto,
        group: groupRaw ? { id: groupId, name: groupName, urlname: groupUrlname } : null,
      };

      let eventForMarkdown: EventDetails = eventDetails;
      if (options.privacyMode === "pseudonymized" && effectiveSalt) {
        const salt = effectiveSalt;
        eventForMarkdown = {
          ...eventDetails,
          eventHosts: eventDetails.eventHosts.map((h) => ({
            ...h,
            memberId: `${PSEUDONYM_PREFIXES.member}${stableHash(h.memberId, salt)}`,
            name: `${PSEUDONYM_PREFIXES.member}${stableHash(h.name, salt)}`,
          })),
        };
      }

      await writeEventMarkdown(markdownEventsDir, eventForMarkdown, options.privacyMode);
    }

    counts.events++;
  }

  // Pass 3: rsvps
  if (options.privacyMode !== "public-archive") {
    for await (const record of readJsonlRecords(join(rawDir, "rsvps.jsonl"))) {
      if (record.entityType !== "rsvp") continue;
      const raw = record.raw as Record<string, unknown>;
      const eventId = (record.parentIds?.["eventId"] as string) ?? "";
      const rsvpId = (raw["id"] as string) ?? "";
      const memberId = (raw["memberId"] as string) ?? "";
      const memberName = (raw["memberName"] as string) ?? "";
      const memberEmailRaw = raw["memberEmail"];
      const memberEmail =
        memberEmailRaw === null || memberEmailRaw === undefined ? null : (memberEmailRaw as string);

      const eventTitle = eventTitleMap.get(eventId) ?? "";
      // We don't have event datetime from rsvp record directly; use empty string as fallback
      const eventDateTime = "";

      rsvpCsvRows.push(
        applyRsvpPrivacy(
          { eventId, rsvpId, memberId, memberName, memberEmail },
          options.privacyMode,
          effectiveSalt,
        ),
      );
      attendeeCsvRows.push(
        applyAttendeePrivacy(
          {
            memberEmail,
            memberName,
            eventId,
            eventTitle,
            eventDateTime,
            rsvpId,
          },
          options.privacyMode,
          effectiveSalt,
        ),
      );
      counts.rsvps++;
    }
  }

  // Pass 4: registration-answers
  if (options.privacyMode !== "public-archive") {
    for await (const record of readJsonlRecords(join(rawDir, "registration-answers.jsonl"))) {
      if (record.entityType !== "registration-answer") continue;
      const raw = record.raw as Record<string, unknown>;
      const eventId = (record.parentIds?.["eventId"] as string) ?? "";
      const question = (raw["question"] as string) ?? "";
      const answer = (raw["answer"] as string) ?? "";
      const eventTitle = eventTitleMap.get(eventId) ?? "";

      answerCsvRows.push({ eventId, eventTitle, question, answer });
      counts.registrationAnswers++;
    }
  }

  if (!options.dryRun) {
    if (groupCsvRows.length > 0) {
      await writeGroupsCsv(join(options.outDir, "csv/groups.csv"), groupCsvRows);
    }
    if (eventCsvRows.length > 0) {
      await writeEventsCsv(join(options.outDir, "csv/events.csv"), eventCsvRows);
    }
    if (photoCsvRows.length > 0) {
      await writePhotosCsv(join(options.outDir, "csv/photos.csv"), photoCsvRows);
    }
    if (rsvpCsvRows.length > 0) {
      await writeRsvpsCsv(join(options.outDir, "csv/rsvps.csv"), rsvpCsvRows);
    }
    if (attendeeCsvRows.length > 0) {
      await writeAttendeesCsv(join(options.outDir, "csv/attendees.csv"), attendeeCsvRows);
    }
    if (answerCsvRows.length > 0) {
      await writeRegistrationAnswersCsv(
        join(options.outDir, "csv/registration-answers.csv"),
        answerCsvRows,
      );
    }
    await writeChecksums(options.outDir);
  } else {
    logger.info(`[dry-run] would write ${groupCsvRows.length} group rows`);
    logger.info(`[dry-run] would write ${eventCsvRows.length} event rows`);
    logger.info(`[dry-run] would write ${photoCsvRows.length} photo rows`);
    logger.info(`[dry-run] would write ${rsvpCsvRows.length} RSVP rows`);
    logger.info(`[dry-run] would write ${answerCsvRows.length} registration answer rows`);
    if (options.includeMarkdown) {
      logger.info(`[dry-run] would write ${eventCsvRows.length} event markdown files`);
    }
    logger.info("[dry-run] would write checksums/sha256.txt");
  }

  return counts;
}
