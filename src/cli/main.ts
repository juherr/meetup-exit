import { program } from "commander";
import { verifyAuthCommand } from "./commands/verify-auth.ts";

program
  .name("meetup-exit")
  .description("Export Meetup Pro data before leaving the platform")
  .version("0.1.0")
  .addCommand(verifyAuthCommand);

await program.parseAsync(process.argv);
