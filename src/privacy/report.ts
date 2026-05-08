import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { PrivacyMode } from "./modes.ts";

export type GdprReportInput = {
  privacyMode: PrivacyMode;
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
};

export async function writeGdprReport(outDir: string, input: GdprReportInput): Promise<void> {
  const { privacyMode, includes, counts } = input;
  const isPublicArchive = privacyMode === "public-archive";

  const lines: string[] = ["# GDPR Review", ""];

  lines.push("## Private files", "");
  const privateFiles: string[] = [];
  if (includes.rsvps && counts.rsvps > 0 && !isPublicArchive) {
    privateFiles.push("- `raw/rsvps.jsonl`: contains member names and emails.");
    privateFiles.push("- `csv/rsvps.csv`: contains member names and emails.");
    privateFiles.push("- `csv/attendees.csv`: contains member names and emails.");
  }
  if (includes.registrationAnswers && counts.registrationAnswers > 0 && !isPublicArchive) {
    privateFiles.push("- `raw/registration-answers.jsonl`: may contain free text personal data.");
    privateFiles.push("- `csv/registration-answers.csv`: may contain free text personal data.");
  }
  if (privateFiles.length > 0) {
    lines.push(...privateFiles);
  } else {
    lines.push("_None — no private data was exported._");
  }
  lines.push("");

  lines.push("## Public-safe files", "");
  const publicFiles: string[] = [];
  if (includes.events && isPublicArchive) {
    publicFiles.push(`- \`csv/events.csv\` — generated with \`${privacyMode}\` mode.`);
  }
  if (includes.markdown && isPublicArchive) {
    publicFiles.push(`- \`markdown/events/*.md\` — generated with \`${privacyMode}\` mode.`);
  }
  if (publicFiles.length > 0) {
    lines.push(...publicFiles);
  } else {
    lines.push("_Validate privacy mode before publishing any file._");
  }
  lines.push("");

  lines.push("## Recommendations", "");
  lines.push("- Do not publish the full raw export.");
  lines.push("- Validate consent before importing emails into a newsletter tool.");
  lines.push("- Keep private archive access restricted.");
  if (privacyMode === "pseudonymized") {
    lines.push("- Keep the pseudonymization salt secret — do not include it in the archive.");
  }
  lines.push("");

  await mkdir(join(outDir, "reports"), { recursive: true });
  await writeFile(join(outDir, "reports/gdpr-review.md"), lines.join("\n"), "utf-8");
}
