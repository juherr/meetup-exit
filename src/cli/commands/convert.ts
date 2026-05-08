import { Command } from "commander";
import { createLogger } from "../../logging/index.ts";
import { runConvert, PRIVACY_MODES } from "../../export/convert.ts";
import type { PrivacyMode } from "../../export/convert.ts";

type ConvertOpts = {
  input: string;
  out: string;
  includeMarkdown?: true;
  privacyMode: string;
  pseudonymizationSalt?: string;
  dryRun?: true;
  jsonLogs?: true;
};

export const convertCommand = new Command("convert")
  .description("Re-derive CSV and Markdown outputs from an existing raw JSONL archive")
  .requiredOption("--input <dir>", "path to existing export directory (must contain raw/*.jsonl)")
  .requiredOption("--out <dir>", "output directory for CSV and Markdown files")
  .option("--include-markdown", "generate Markdown files for events")
  .option(
    "--privacy-mode <mode>",
    `privacy mode (${PRIVACY_MODES.join(", ")})`,
    process.env["MEETUP_PRIVACY_MODE"] ?? "full",
  )
  .option(
    "--pseudonymization-salt <salt>",
    "salt for stable pseudonymization hashes (required for --privacy-mode pseudonymized)",
    process.env["MEETUP_PSEUDONYMIZATION_SALT"],
  )
  .option("--dry-run", "process data without writing any files")
  .option("--json-logs", "output logs as JSON")
  .action(async (opts: ConvertOpts) => {
    const logger = createLogger(opts.jsonLogs === true);

    if (!PRIVACY_MODES.includes(opts.privacyMode as PrivacyMode)) {
      logger.error(`--privacy-mode must be one of: ${PRIVACY_MODES.join(", ")}`);
      process.exit(5);
    }
    const privacyMode = opts.privacyMode as PrivacyMode;

    try {
      if (opts.dryRun === true) logger.info("dry-run mode — no files will be written");

      const counts = await runConvert(
        {
          inputDir: opts.input,
          outDir: opts.out,
          includeMarkdown: opts.includeMarkdown === true,
          privacyMode,
          ...(opts.pseudonymizationSalt !== undefined
            ? { pseudonymizationSalt: opts.pseudonymizationSalt }
            : {}),
          dryRun: opts.dryRun === true,
        },
        logger,
      );

      console.log(`\nConvert ${counts.errors > 0 ? "completed with errors" : "completed"}`);
      console.log(`- groups: ${counts.groups}`);
      console.log(`- events: ${counts.events}`);
      console.log(`- rsvps: ${counts.rsvps}`);
      console.log(`- registration answers: ${counts.registrationAnswers}`);
      console.log(`- errors: ${counts.errors}`);
      if (!opts.dryRun) console.log(`\nOutput: ${opts.out}`);

      if (counts.errors > 0) process.exit(4);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("No raw JSONL files found")) {
        logger.error(error.message);
        process.exit(1);
      }
      logger.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });
