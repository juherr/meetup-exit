import { createHash } from "node:crypto";

export function stableHash(value: string, salt: string): string {
  return createHash("sha256").update(salt).update(":").update(value).digest("hex").slice(0, 12);
}
