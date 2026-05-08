import { describe, expect, it } from "vitest";
import { stableHash } from "../../src/privacy/hash.ts";

describe("stableHash", () => {
  it("returns a 12-character hex string", () => {
    const result = stableHash("alice@example.com", "mysalt");
    expect(result).toMatch(/^[0-9a-f]{12}$/);
  });

  it("is deterministic for the same input", () => {
    expect(stableHash("alice@example.com", "mysalt")).toBe(
      stableHash("alice@example.com", "mysalt"),
    );
  });

  it("differs for different values", () => {
    expect(stableHash("alice@example.com", "mysalt")).not.toBe(
      stableHash("bob@example.com", "mysalt"),
    );
  });

  it("differs for different salts", () => {
    expect(stableHash("alice@example.com", "salt1")).not.toBe(
      stableHash("alice@example.com", "salt2"),
    );
  });
});
