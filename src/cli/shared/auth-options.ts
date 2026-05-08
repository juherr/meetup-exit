import { readFile } from "node:fs/promises";
import type { Command } from "commander";

export const MEETUP_ENDPOINT = "https://api.meetup.com/gql-ext";
import { AccessTokenAuthProvider } from "../../auth/access-token.ts";
import { OAuthJwtBearerAuthProvider } from "../../auth/jwt-bearer.ts";
import type { MeetupAuthProvider } from "../../auth/provider.ts";
import type { AuthMode } from "../../auth/provider.ts";

export type AuthOpts = {
  auth: AuthMode;
  accessToken?: string;
  clientKey?: string;
  memberId?: string;
  signingKeyId?: string;
  privateKey?: string;
};

export function addAuthOptions(cmd: Command): Command {
  return cmd
    .option(
      "--auth <mode>",
      "authentication mode: access-token, jwt-bearer, refresh-token",
      process.env["MEETUP_AUTH_MODE"] ?? "access-token",
    )
    .option("--access-token <token>", "direct access token", process.env["MEETUP_ACCESS_TOKEN"])
    .option("--client-key <key>", "OAuth client key", process.env["MEETUP_CLIENT_KEY"])
    .option("--member-id <id>", "authorized member id", process.env["MEETUP_AUTHORIZED_MEMBER_ID"])
    .option("--signing-key-id <id>", "signing key id", process.env["MEETUP_SIGNING_KEY_ID"])
    .option(
      "--private-key <path>",
      "path to RSA private key PEM file",
      process.env["MEETUP_PRIVATE_KEY_PATH"],
    );
}

export async function buildAuthProvider(opts: AuthOpts): Promise<MeetupAuthProvider> {
  switch (opts.auth) {
    case "access-token": {
      if (opts.accessToken === undefined || opts.accessToken === "") {
        console.error("--access-token or MEETUP_ACCESS_TOKEN is required for access-token mode");
        process.exit(5);
      }
      return new AccessTokenAuthProvider(opts.accessToken);
    }
    case "jwt-bearer": {
      const missing = (
        [
          ["--client-key / MEETUP_CLIENT_KEY", opts.clientKey],
          ["--member-id / MEETUP_AUTHORIZED_MEMBER_ID", opts.memberId],
          ["--signing-key-id / MEETUP_SIGNING_KEY_ID", opts.signingKeyId],
          ["--private-key / MEETUP_PRIVATE_KEY_PATH", opts.privateKey],
        ] as Array<[string, string | undefined]>
      )
        .filter(([, v]) => v === undefined || v === "")
        .map(([name]) => name);

      if (missing.length > 0) {
        console.error(`Missing required options for jwt-bearer mode: ${missing.join(", ")}`);
        process.exit(5);
      }

      const privateKeyPem = await readFile(opts.privateKey!, "utf-8");

      return new OAuthJwtBearerAuthProvider({
        clientKey: opts.clientKey!,
        authorizedMemberId: opts.memberId!,
        signingKeyId: opts.signingKeyId!,
        privateKeyPem,
      });
    }
    default: {
      console.error(`Unsupported auth mode: ${opts.auth}. Use access-token or jwt-bearer.`);
      process.exit(5);
    }
  }
}
