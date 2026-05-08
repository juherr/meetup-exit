import { Command } from "commander";
import { AuthenticationError, AuthorizationError } from "../../errors/index.ts";
import { createLogger } from "../../logging/index.ts";
import { MeetupGraphqlClient } from "../../meetup/client.ts";
import { runExport, PRIVACY_MODES } from "../../export/orchestrator.ts";
import type { PrivacyMode } from "../../export/orchestrator.ts";
import { MEETUP_ENDPOINT, addAuthOptions, buildAuthProvider } from "../shared/auth-options.ts";
import type { AuthOpts } from "../shared/auth-options.ts";

type ExportOpts = AuthOpts & {
  network: string;
  out: string;
  includeGroups?: true;
  includeEvents?: true;
  includeRsvps?: true;
  includeRegistrationAnswers?: true;
  includeMarkdown?: true;
  eventStatus: string[];
  allEventStatuses?: true;
  pageSize: string;
  privacyMode: string;
  dryRun?: true;
  endpoint: string;
  jsonLogs?: true;
};

const collect = (val: string, acc: string[]) => [...acc, val];

export const exportCommand = addAuthOptions(
  new Command("export").description("Export Meetup Pro network data to an archive directory"),
)
  .requiredOption("--network <urlname>", "Pro network URL name")
  .requiredOption("--out <dir>", "output directory for the archive")
  .option("--include-groups", "export groups")
  .option("--include-events", "export events")
  .option("--include-rsvps", "export RSVPs (requires --include-events)")
  .option(
    "--include-registration-answers",
    "export registration answers (requires --include-events)",
  )
  .option("--include-markdown", "generate Markdown files for events (requires --include-events)")
  .option(
    "--event-status <status>",
    "event status filter, repeatable (UPCOMING, PAST, etc.)",
    collect,
    [] as string[],
  )
  .option("--all-event-statuses", "include UPCOMING and PAST events")
  .option("--page-size <n>", "number of items per page", "100")
  .option(
    "--privacy-mode <mode>",
    `privacy mode (${PRIVACY_MODES.join(", ")})`,
    process.env["MEETUP_PRIVACY_MODE"] ?? "full",
  )
  .option("--dry-run", "fetch data without writing any files")
  .option("--endpoint <url>", "GraphQL endpoint", process.env["MEETUP_ENDPOINT"] ?? MEETUP_ENDPOINT)
  .option("--json-logs", "output logs as JSON")
  .action(async (opts: ExportOpts) => {
    const logger = createLogger(opts.jsonLogs === true);

    const pageSize = parseInt(opts.pageSize, 10);
    if (isNaN(pageSize) || pageSize <= 0) {
      logger.error("--page-size must be a positive integer");
      process.exit(5);
    }

    if (!PRIVACY_MODES.includes(opts.privacyMode as PrivacyMode)) {
      logger.error(`--privacy-mode must be one of: ${PRIVACY_MODES.join(", ")}`);
      process.exit(5);
    }
    const privacyMode = opts.privacyMode as PrivacyMode;

    const eventStatuses = opts.allEventStatuses ? ["UPCOMING", "PAST"] : opts.eventStatus;

    const client = new MeetupGraphqlClient({
      endpoint: opts.endpoint,
      authProvider: await buildAuthProvider(opts),
    });

    try {
      if (opts.dryRun === true) logger.info("dry-run mode — no files will be written");

      const counts = await runExport(
        client,
        {
          network: opts.network,
          outDir: opts.out,
          includeGroups: opts.includeGroups === true,
          includeEvents: opts.includeEvents === true,
          includeRsvps: opts.includeRsvps === true,
          includeRegistrationAnswers: opts.includeRegistrationAnswers === true,
          includeMarkdown: opts.includeMarkdown === true,
          eventStatuses,
          pageSize,
          privacyMode,
          dryRun: opts.dryRun === true,
          endpoint: opts.endpoint,
          authMode: opts.auth,
          toolVersion: "0.1.0",
        },
        logger,
      );

      console.log(`\nExport ${counts.errors > 0 ? "completed with errors" : "completed"}`);
      console.log(`- groups: ${counts.groups}`);
      console.log(`- events: ${counts.events}`);
      console.log(`- rsvps: ${counts.rsvps}`);
      console.log(`- registration answers: ${counts.registrationAnswers}`);
      console.log(`- errors: ${counts.errors}`);
      if (!opts.dryRun) console.log(`\nArchive: ${opts.out}`);

      if (counts.errors > 0) process.exit(4);
    } catch (error) {
      if (error instanceof AuthenticationError) {
        logger.error(`authentication failed: ${error.message}`);
        process.exit(2);
      }
      if (error instanceof AuthorizationError) {
        logger.error(`network access denied: ${error.message}`);
        process.exit(3);
      }
      logger.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    } finally {
      await client.close();
    }
  });
