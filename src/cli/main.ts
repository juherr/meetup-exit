import { program } from "commander";
import { exportCommand } from "./commands/export.ts";
import { convertCommand } from "./commands/convert.ts";
import { doctorCommand } from "./commands/doctor.ts";
import { introspectCommand } from "./commands/introspect.ts";
import { probeNetworkCommand } from "./commands/probe-network.ts";
import { verifyAuthCommand } from "./commands/verify-auth.ts";

program
  .name("meetup-exit")
  .description("Export Meetup Pro data before leaving the platform")
  .version("0.1.0")
  .addCommand(verifyAuthCommand)
  .addCommand(probeNetworkCommand)
  .addCommand(introspectCommand)
  .addCommand(exportCommand)
  .addCommand(convertCommand)
  .addCommand(doctorCommand);

await program.parseAsync(process.argv);
