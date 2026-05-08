import { Command } from "commander";
import { AuthenticationError, AuthorizationError } from "../../errors/index.ts";
import { createLogger } from "../../logging/index.ts";
import { MeetupGraphqlClient } from "../../meetup/client.ts";
import { getProNetworkProbe } from "../../meetup/functions/get-pro-network-probe.ts";
import { MEETUP_ENDPOINT, addAuthOptions, buildAuthProvider } from "../shared/auth-options.ts";
import type { AuthOpts } from "../shared/auth-options.ts";

type ProbeNetworkOpts = AuthOpts & {
  network: string;
  endpoint: string;
  jsonLogs?: true;
};

export const probeNetworkCommand = addAuthOptions(
  new Command("probe-network").description(
    "Verify Pro network access and display basic network info",
  ),
)
  .requiredOption("--network <urlname>", "Pro network URL name")
  .option("--endpoint <url>", "GraphQL endpoint", process.env["MEETUP_ENDPOINT"] ?? MEETUP_ENDPOINT)
  .option("--json-logs", "output logs as JSON")
  .action(async (opts: ProbeNetworkOpts) => {
    const logger = createLogger(opts.jsonLogs === true);
    const client = new MeetupGraphqlClient({
      endpoint: opts.endpoint,
      authProvider: await buildAuthProvider(opts),
    });

    try {
      logger.info(`probing network ${opts.network}...`);
      const result = await getProNetworkProbe(client, opts.network);
      logger.info(`network ${opts.network} is accessible`);
      const sampleNames = result.sampleGroups.map((g) => g.name).join(", ");
      console.log(`\nNetwork ${opts.network} is accessible`);
      console.log(`- total groups: ${result.totalCount}`);
      if (sampleNames) console.log(`- sample groups: ${sampleNames}`);
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
    }

    await client.close();
  });
