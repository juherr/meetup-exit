import { writeFile } from "node:fs/promises";
import { join } from "node:path";

export type ManifestData = {
  tool: "meetup-exit";
  version: string;
  startedAt: string;
  finishedAt: string;
  endpoint: string;
  networkUrlname: string;
  authMode: string;
  privacyMode: string;
  includes: {
    groups: boolean;
    events: boolean;
    rsvps: boolean;
    registrationAnswers: boolean;
    markdown: boolean;
  };
  counts: {
    groups: number;
    events: number;
    rsvps: number;
    registrationAnswers: number;
    errors: number;
  };
  metrics: {
    graphqlRequests: number;
    rateLimitedRetries: number;
    durationSeconds: number;
  };
  schemaIntrospectionSha256?: string;
};

export async function writeManifest(outDir: string, data: ManifestData): Promise<void> {
  await writeFile(join(outDir, "manifest.json"), JSON.stringify(data, null, 2) + "\n", "utf-8");
}
