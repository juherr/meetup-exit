import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { Command } from "commander";
import { getIntrospectionQuery } from "graphql";
import { AuthenticationError } from "../../errors/index.ts";
import { createLogger } from "../../logging/index.ts";
import { MeetupGraphqlClient, MeetupQueryCost } from "../../meetup/client.ts";
import { MEETUP_ENDPOINT, addAuthOptions, buildAuthProvider } from "../shared/auth-options.ts";
import type { AuthOpts } from "../shared/auth-options.ts";

type IntrospectOpts = AuthOpts & {
  out: string;
  force?: true;
  endpoint: string;
  jsonLogs?: true;
};

export const introspectCommand = addAuthOptions(
  new Command("introspect").description("Dump the Meetup GraphQL schema to a JSON file"),
)
  .requiredOption("--out <path>", "output path for introspection JSON")
  .option("--force", "overwrite existing file")
  .option("--endpoint <url>", "GraphQL endpoint", process.env["MEETUP_ENDPOINT"] ?? MEETUP_ENDPOINT)
  .option("--json-logs", "output logs as JSON")
  .action(async (opts: IntrospectOpts) => {
    const logger = createLogger(opts.jsonLogs === true);
    const client = new MeetupGraphqlClient({
      endpoint: opts.endpoint,
      authProvider: await buildAuthProvider(opts),
    });

    try {
      logger.info("introspecting schema...");
      const result = await client.request<Record<string, unknown>>(
        getIntrospectionQuery(),
        undefined,
        {
          estimatedCost: MeetupQueryCost.introspection,
        },
      );

      await mkdir(dirname(opts.out), { recursive: true });
      await writeFile(
        opts.out,
        JSON.stringify(result, null, 2),
        opts.force ? "utf-8" : { encoding: "utf-8", flag: "wx" },
      );

      logger.info(`schema written to ${opts.out}`);
      console.log(`\nSchema introspected and saved to ${opts.out}`);
    } catch (error) {
      if (error instanceof AuthenticationError) {
        logger.error(`authentication failed: ${error.message}`);
        process.exit(2);
      }
      const nodeError = error as NodeJS.ErrnoException;
      if (nodeError.code === "EEXIST") {
        logger.error(`${opts.out} already exists — use --force to overwrite`);
        process.exit(1);
      }
      logger.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }

    await client.close();
  });
