import { Command } from "commander";
import { AuthenticationError } from "../../errors/index.ts";
import { createLogger } from "../../logging/index.ts";
import { MeetupGraphqlClient } from "../../meetup/client.ts";
import { getSelf } from "../../meetup/functions/get-self.ts";
import { MEETUP_ENDPOINT, addAuthOptions, buildAuthProvider } from "../shared/auth-options.ts";
import type { AuthOpts } from "../shared/auth-options.ts";

type VerifyAuthOpts = AuthOpts & {
  endpoint: string;
  jsonLogs?: true;
};

export const verifyAuthCommand = addAuthOptions(
  new Command("verify-auth").description("Verify Meetup API authentication and display identity"),
)
  .option("--endpoint <url>", "GraphQL endpoint", process.env["MEETUP_ENDPOINT"] ?? MEETUP_ENDPOINT)
  .option("--json-logs", "output logs as JSON")
  .action(async (opts: VerifyAuthOpts) => {
    const logger = createLogger(opts.jsonLogs === true);
    const client = new MeetupGraphqlClient({
      endpoint: opts.endpoint,
      authProvider: await buildAuthProvider(opts),
    });

    try {
      logger.info("verifying auth...");
      const self = await getSelf(client);
      logger.info(`authenticated as ${self.name} (${self.id})`);
      console.log(`\nAuthenticated as ${self.name} (${self.id})`);
    } catch (error) {
      if (error instanceof AuthenticationError) {
        logger.error(`authentication failed: ${error.message}`);
        process.exit(2);
      }
      logger.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }

    await client.close();
  });
