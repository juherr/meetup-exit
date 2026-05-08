import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { writeManifest } from "../../src/archive/manifest.ts";
import type { ManifestData } from "../../src/archive/manifest.ts";

function tmpDir(): string {
  return join(tmpdir(), `meetup-exit-test-${randomBytes(4).toString("hex")}`);
}

const baseManifest: ManifestData = {
  tool: "meetup-exit",
  version: "0.1.0",
  startedAt: "2026-05-08T08:15:00.000Z",
  finishedAt: "2026-05-08T08:22:12.000Z",
  endpoint: "https://api.meetup.com/gql-ext",
  networkUrlname: "elsassjug",
  authMode: "jwt-bearer",
  privacyMode: "full",
  includes: {
    groups: true,
    events: true,
    rsvps: false,
    registrationAnswers: false,
    markdown: false,
  },
  counts: { groups: 1, events: 10, rsvps: 0, registrationAnswers: 0, errors: 0 },
  metrics: { graphqlRequests: 0, rateLimitedRetries: 0, durationSeconds: 432 },
};

describe("writeManifest", () => {
  it("writes valid JSON to manifest.json", async () => {
    const dir = tmpDir();
    await mkdir(dir, { recursive: true });

    await writeManifest(dir, baseManifest);

    const { readFile } = await import("node:fs/promises");
    const content = await readFile(join(dir, "manifest.json"), "utf-8");
    const parsed = JSON.parse(content);

    expect(parsed.tool).toBe("meetup-exit");
    expect(parsed.version).toBe("0.1.0");
    expect(parsed.networkUrlname).toBe("elsassjug");
    expect(parsed.authMode).toBe("jwt-bearer");
    expect(parsed.privacyMode).toBe("full");
    expect(parsed.includes.groups).toBe(true);
    expect(parsed.includes.rsvps).toBe(false);
    expect(parsed.counts.events).toBe(10);
    expect(parsed.metrics.durationSeconds).toBe(432);
  });

  it("omits schemaIntrospectionSha256 when not provided", async () => {
    const dir = tmpDir();
    await mkdir(dir, { recursive: true });

    await writeManifest(dir, baseManifest);

    const { readFile } = await import("node:fs/promises");
    const content = await readFile(join(dir, "manifest.json"), "utf-8");
    const parsed = JSON.parse(content);

    expect(parsed.schemaIntrospectionSha256).toBeUndefined();
  });

  it("includes schemaIntrospectionSha256 when provided", async () => {
    const dir = tmpDir();
    await mkdir(dir, { recursive: true });

    const hash = "sha256:abc123";
    await writeManifest(dir, { ...baseManifest, schemaIntrospectionSha256: hash });

    const { readFile } = await import("node:fs/promises");
    const content = await readFile(join(dir, "manifest.json"), "utf-8");
    const parsed = JSON.parse(content);

    expect(parsed.schemaIntrospectionSha256).toBe(hash);
  });
});
