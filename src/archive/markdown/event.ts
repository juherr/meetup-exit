import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { EventDetails } from "../../meetup/functions/get-event-details.ts";
import { slugify } from "./slug.ts";

function yamlEscape(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
}

function buildFrontmatter(event: EventDetails, privacyMode: string): string {
  const lines = [
    "---",
    "source: meetup",
    `event_id: "${event.id}"`,
    `group_id: "${event.group?.id ?? ""}"`,
    `group_name: "${yamlEscape(event.group?.name ?? "")}"`,
    `title: "${yamlEscape(event.title)}"`,
    `date_time: "${event.dateTime}"`,
    `duration: "${event.duration}"`,
    `event_url: "${event.eventUrl}"`,
    "hosts:",
  ];

  for (const host of event.eventHosts) {
    lines.push(`  - member_id: "${host.memberId}"`);
    lines.push(`    name: "${yamlEscape(host.name)}"`);
  }

  if (event.featuredEventPhoto) {
    lines.push("featured_photo:");
    lines.push(`  id: "${event.featuredEventPhoto.id}"`);
    lines.push(`  base_url: "${event.featuredEventPhoto.baseUrl}"`);
  }

  lines.push(`privacy_mode: ${privacyMode}`);
  lines.push("---");

  return lines.join("\n");
}

function buildContent(event: EventDetails): string {
  return [
    `# ${event.title}`,
    "",
    `Event date: ${event.dateTime}`,
    "",
    "## Description",
    "",
    event.description,
    "",
  ].join("\n");
}

export async function writeEventMarkdown(
  dir: string,
  event: EventDetails,
  privacyMode: string,
): Promise<void> {
  const date = event.dateTime.slice(0, 10);
  const slug = slugify(event.title, event.id);
  const filePath = join(dir, `${date}-${slug}.md`);

  const frontmatter = buildFrontmatter(event, privacyMode);
  const content = buildContent(event);
  await writeFile(filePath, `${frontmatter}\n\n${content}`, "utf-8");
}
