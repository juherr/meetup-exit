import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { AuthenticationError, AuthorizationError } from "../errors/index.ts";
import type { Logger } from "../logging/index.ts";
import type { MeetupGraphqlClient } from "../meetup/client.ts";
import { listGroups } from "../meetup/functions/list-groups.ts";
import { getEventDetails } from "../meetup/functions/get-event-details.ts";
import type { EventDetails } from "../meetup/functions/get-event-details.ts";
import { listEvents } from "../meetup/functions/list-events.ts";
import { listEventRsvps } from "../meetup/functions/list-event-rsvps.ts";
import { listEventRegistrationAnswers } from "../meetup/functions/list-event-registration-answers.ts";
import { JsonlWriter } from "../archive/jsonl-writer.ts";
import {
  writeGroupsCsv,
  writeEventsCsv,
  writeRsvpsCsv,
  writeAttendeesCsv,
  writeRegistrationAnswersCsv,
} from "../archive/csv/index.ts";
import type {
  GroupCsvRow,
  EventCsvRow,
  RsvpCsvRow,
  AttendeeCsvRow,
  RegistrationAnswerCsvRow,
} from "../archive/csv/index.ts";
import { writeEventMarkdown } from "../archive/markdown/index.ts";

export const PRIVACY_MODES = ["full", "no-email", "pseudonymized", "public-archive"] as const;
export type PrivacyMode = (typeof PRIVACY_MODES)[number];

export type ExportOptions = {
  network: string;
  outDir: string;
  includeGroups: boolean;
  includeEvents: boolean;
  includeRsvps: boolean;
  includeRegistrationAnswers: boolean;
  includeMarkdown: boolean;
  eventStatuses: string[];
  pageSize: number;
  privacyMode: PrivacyMode;
  dryRun: boolean;
};

export type ExportCounts = {
  groups: number;
  events: number;
  rsvps: number;
  registrationAnswers: number;
  errors: number;
};

export async function runExport(
  client: MeetupGraphqlClient,
  options: ExportOptions,
  logger: Logger,
): Promise<ExportCounts> {
  const counts: ExportCounts = {
    groups: 0,
    events: 0,
    rsvps: 0,
    registrationAnswers: 0,
    errors: 0,
  };

  const markdownEventsDir = join(options.outDir, "markdown", "events");

  if (!options.dryRun) {
    await Promise.all([
      mkdir(join(options.outDir, "raw"), { recursive: true }),
      mkdir(join(options.outDir, "csv"), { recursive: true }),
      ...(options.includeMarkdown ? [mkdir(markdownEventsDir, { recursive: true })] : []),
    ]);
  }

  const groupCsvRows: GroupCsvRow[] = [];
  const eventCsvRows: EventCsvRow[] = [];
  const rsvpCsvRows: RsvpCsvRow[] = [];
  const attendeeCsvRows: AttendeeCsvRow[] = [];
  const answerCsvRows: RegistrationAnswerCsvRow[] = [];

  const exportedAt = new Date().toISOString();

  const groupsWriter = new JsonlWriter(join(options.outDir, "raw/groups.jsonl"));
  const eventsWriter = new JsonlWriter(join(options.outDir, "raw/events.jsonl"));
  const eventDetailsWriter = new JsonlWriter(join(options.outDir, "raw/event-details.jsonl"));
  const rsvpsWriter = new JsonlWriter(join(options.outDir, "raw/rsvps.jsonl"));
  const answersWriter = new JsonlWriter(join(options.outDir, "raw/registration-answers.jsonl"));

  try {
    if (options.includeGroups) {
      logger.info("fetching groups...");
      const groups = await listGroups(client, options.network, { pageSize: options.pageSize });
      for (const group of groups) {
        if (!options.dryRun) {
          await groupsWriter.write({
            source: "meetup",
            exportedAt,
            entityType: "group",
            sourceId: group.id,
            raw: group,
          });
        }
        groupCsvRows.push({
          groupId: group.id,
          name: group.name,
          urlname: group.urlname,
          membershipsCount: group.membershipCount,
        });
        counts.groups++;
      }
      logger.info(`fetched ${counts.groups} groups`);
    }

    if (options.includeEvents) {
      const eventMap = new Map<string, { id: string; title: string }>();

      for (const status of options.eventStatuses) {
        logger.info(`fetching events with status ${status}...`);
        const events = await listEvents(client, options.network, {
          pageSize: options.pageSize,
          status,
        });
        for (const event of events) {
          if (!eventMap.has(event.id)) {
            eventMap.set(event.id, event);
            if (!options.dryRun) {
              await eventsWriter.write({
                source: "meetup",
                exportedAt,
                entityType: "event",
                sourceId: event.id,
                raw: event,
              });
            }
            counts.events++;
          }
        }
      }
      logger.info(`fetched ${counts.events} unique events`);

      const eventDetailsMap = new Map<string, EventDetails>();
      for (const event of eventMap.values()) {
        try {
          const details = await getEventDetails(client, event.id);
          eventDetailsMap.set(event.id, details);
          if (!options.dryRun) {
            await eventDetailsWriter.write({
              source: "meetup",
              exportedAt,
              entityType: "event-details",
              sourceId: event.id,
              raw: details,
            });
          }
          eventCsvRows.push({
            eventId: details.id,
            groupId: details.group?.id ?? "",
            groupName: details.group?.name ?? "",
            groupUrlname: details.group?.urlname ?? "",
            title: details.title,
            eventUrl: details.eventUrl,
            dateTime: details.dateTime,
            duration: details.duration,
            hostNames: details.eventHosts.map((h) => h.name).join("|"),
            hostMemberIds: details.eventHosts.map((h) => h.memberId).join("|"),
            featuredPhotoId: details.featuredEventPhoto?.id ?? "",
            featuredPhotoBaseUrl: details.featuredEventPhoto?.baseUrl ?? "",
          });
          if (options.includeMarkdown && !options.dryRun) {
            await writeEventMarkdown(markdownEventsDir, details, options.privacyMode);
          }
        } catch (error) {
          if (error instanceof AuthenticationError || error instanceof AuthorizationError)
            throw error;
          logger.warn(
            `failed to fetch details for event ${event.id}: ${error instanceof Error ? error.message : String(error)}`,
          );
          counts.errors++;
        }
      }

      if (options.includeRsvps) {
        for (const eventId of eventDetailsMap.keys()) {
          try {
            const rsvps = await listEventRsvps(client, eventId, { pageSize: options.pageSize });
            const details = eventDetailsMap.get(eventId)!;
            for (const rsvp of rsvps) {
              if (!options.dryRun) {
                await rsvpsWriter.write({
                  source: "meetup",
                  exportedAt,
                  entityType: "rsvp",
                  sourceId: rsvp.id,
                  parentIds: { eventId },
                  raw: rsvp,
                });
              }
              rsvpCsvRows.push({
                eventId,
                rsvpId: rsvp.id,
                memberId: rsvp.memberId,
                memberName: rsvp.memberName,
                memberEmail: rsvp.memberEmail,
              });
              attendeeCsvRows.push({
                memberEmail: rsvp.memberEmail,
                memberName: rsvp.memberName,
                eventId,
                eventTitle: details.title,
                eventDateTime: details.dateTime,
                rsvpId: rsvp.id,
              });
              counts.rsvps++;
            }
          } catch (error) {
            if (error instanceof AuthenticationError || error instanceof AuthorizationError)
              throw error;
            logger.warn(
              `failed to fetch RSVPs for event ${eventId}: ${error instanceof Error ? error.message : String(error)}`,
            );
            counts.errors++;
          }
        }
        logger.info(`fetched ${counts.rsvps} RSVPs`);
      }

      if (options.includeRegistrationAnswers) {
        for (const eventId of eventDetailsMap.keys()) {
          try {
            const answers = await listEventRegistrationAnswers(client, options.network, eventId, {
              pageSize: options.pageSize,
            });
            const details = eventDetailsMap.get(eventId)!;
            for (const answer of answers) {
              if (!options.dryRun) {
                await answersWriter.write({
                  source: "meetup",
                  exportedAt,
                  entityType: "registration-answer",
                  sourceId: `${eventId}-${answer.question}`,
                  parentIds: { eventId },
                  raw: answer,
                });
              }
              answerCsvRows.push({
                eventId,
                eventTitle: details.title,
                question: answer.question,
                answer: answer.answer,
              });
              counts.registrationAnswers++;
            }
          } catch (error) {
            if (error instanceof AuthenticationError || error instanceof AuthorizationError)
              throw error;
            logger.warn(
              `failed to fetch registration answers for event ${eventId}: ${error instanceof Error ? error.message : String(error)}`,
            );
            counts.errors++;
          }
        }
        logger.info(`fetched ${counts.registrationAnswers} registration answer entries`);
      }
    }

    if (!options.dryRun) {
      if (groupCsvRows.length > 0)
        await writeGroupsCsv(join(options.outDir, "csv/groups.csv"), groupCsvRows);
      if (eventCsvRows.length > 0)
        await writeEventsCsv(join(options.outDir, "csv/events.csv"), eventCsvRows);
      if (rsvpCsvRows.length > 0)
        await writeRsvpsCsv(join(options.outDir, "csv/rsvps.csv"), rsvpCsvRows);
      if (attendeeCsvRows.length > 0)
        await writeAttendeesCsv(join(options.outDir, "csv/attendees.csv"), attendeeCsvRows);
      if (answerCsvRows.length > 0)
        await writeRegistrationAnswersCsv(
          join(options.outDir, "csv/registration-answers.csv"),
          answerCsvRows,
        );
    } else {
      logger.info(`[dry-run] would write ${groupCsvRows.length} group rows`);
      logger.info(`[dry-run] would write ${eventCsvRows.length} event rows`);
      if (options.includeRsvps)
        logger.info(`[dry-run] would write ${rsvpCsvRows.length} RSVP rows`);
      if (options.includeRegistrationAnswers)
        logger.info(`[dry-run] would write ${answerCsvRows.length} registration answer rows`);
      if (options.includeMarkdown)
        logger.info(`[dry-run] would write ${eventDetailsMap.size} event markdown files`);
    }
  } finally {
    const closeResults = await Promise.allSettled([
      groupsWriter.close(),
      eventsWriter.close(),
      eventDetailsWriter.close(),
      rsvpsWriter.close(),
      answersWriter.close(),
    ]);
    for (const result of closeResults) {
      if (result.status === "rejected") {
        logger.warn(
          `failed to close archive writer: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`,
        );
      }
    }
  }

  return counts;
}
