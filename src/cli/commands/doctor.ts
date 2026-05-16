import { constants } from "node:fs";
import { access, stat } from "node:fs/promises";
import { Command } from "commander";

// Valid auth modes supported by the CLI
const VALID_AUTH_MODES = ["access-token", "jwt-bearer", "refresh-token"] as const;
type ValidAuthMode = (typeof VALID_AUTH_MODES)[number];

// Required env vars per auth mode (auth-mode aware — D-02)
const REQUIRED_ENV_VARS: Record<ValidAuthMode, string[]> = {
  "access-token": ["MEETUP_ACCESS_TOKEN"],
  "jwt-bearer": [
    "MEETUP_CLIENT_KEY",
    "MEETUP_AUTHORIZED_MEMBER_ID",
    "MEETUP_SIGNING_KEY_ID",
    "MEETUP_PRIVATE_KEY_PATH",
  ],
  "refresh-token": ["MEETUP_CLIENT_SECRET", "MEETUP_REFRESH_TOKEN_FILE"],
};

// Modes that require private key permissions check
const MODES_REQUIRING_KEY_CHECK: ValidAuthMode[] = ["jwt-bearer", "refresh-token"];

function isValidAuthMode(mode: string): mode is ValidAuthMode {
  return (VALID_AUTH_MODES as readonly string[]).includes(mode);
}

export const doctorCommand = new Command("doctor")
  .description("Check Bun version, env vars, key permissions, and output directory writability")
  .action(async () => {
    let failedCount = 0;

    // Check 1: Bun version
    const bunVersion = Bun.version;
    const bunMajor = parseInt(bunVersion.split(".")[0] ?? "0", 10);
    if (bunMajor >= 1) {
      console.log(`✓ Bun version: ${bunVersion}`);
    } else {
      console.log(`✗ Bun version: ${bunVersion} (require ≥ 1.x)`);
      failedCount++;
    }

    // Check 2: Auth mode
    const authMode = process.env["MEETUP_AUTH_MODE"] ?? "access-token";
    if (isValidAuthMode(authMode)) {
      console.log(`✓ Auth mode: ${authMode}`);
    } else {
      console.log(
        `✗ Auth mode: ${authMode} (unknown — expected access-token, jwt-bearer, or refresh-token)`,
      );
      failedCount++;
      // Skip remaining checks that depend on auth mode
      console.log();
      console.log(`${failedCount} check(s) failed.`);
      process.exit(5);
    }

    // Check 3: Required env vars (auth-mode aware)
    const requiredVars = REQUIRED_ENV_VARS[authMode];
    for (const varName of requiredVars) {
      const value = process.env[varName];
      if (value !== undefined && value !== "") {
        // Print only "set" — never print the actual value (D-02 / threat model: secret leakage)
        console.log(`✓ ${varName}: set`);
      } else {
        console.log(`✗ ${varName}: missing`);
        failedCount++;
      }
    }

    // Check 4: Private key permissions (jwt-bearer and refresh-token modes only — D-01)
    if (MODES_REQUIRING_KEY_CHECK.includes(authMode)) {
      const keyPath = process.env["MEETUP_PRIVATE_KEY_PATH"] ?? "./secrets/meetup-private-key.pem";
      try {
        // Use stat to check file mode bits only — do NOT read file content (threat model: private key content exposure)
        const stats = await stat(keyPath);
        const mode = stats.mode & 0o777;
        if (mode === 0o600) {
          console.log(`✓ Private key: ${keyPath} (permissions: 600)`);
        } else {
          const octal = mode.toString(8).padStart(3, "0");
          console.log(`✗ Private key: ${keyPath} (permissions: ${octal} — must be 600)`);
          failedCount++;
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const isNotFound =
          error instanceof Error &&
          "code" in error &&
          (error as NodeJS.ErrnoException).code === "ENOENT";
        if (isNotFound) {
          console.log(`✗ Private key: ${keyPath} (file not found)`);
        } else {
          console.log(`✗ Private key: ${keyPath} (${message})`);
        }
        failedCount++;
      }
    }

    // Check 5: Output directory writability
    // Use fs.access with W_OK — do NOT create files (threat model: denial of service via writable-check side effect)
    const outputDir = "./exports";
    try {
      await access(outputDir, constants.W_OK);
      console.log(`✓ Output dir: ${outputDir} (writable)`);
    } catch {
      console.log(
        `✗ Output dir: ${outputDir} (not writable — create directory or check permissions)`,
      );
      failedCount++;
    }

    // Summary
    console.log();
    if (failedCount === 0) {
      console.log("All checks passed.");
    } else {
      console.log(`${failedCount} check(s) failed.`);
      process.exit(5);
    }
  });
