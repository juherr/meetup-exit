import { describe, expect, it } from "vitest";
import { slugify } from "../../src/archive/markdown/slug.ts";

describe("slugify", () => {
  it("lowercases ASCII titles", () => {
    expect(slugify("Testing API Things 1", "123")).toBe("testing-api-things-1");
  });

  it("removes accents", () => {
    expect(slugify("Réunion café", "42")).toBe("reunion-cafe");
  });

  it("replaces non-alphanumeric sequences with a single dash", () => {
    expect(slugify("Hello, World! (2025)", "1")).toBe("hello-world-2025");
  });

  it("trims leading and trailing dashes", () => {
    expect(slugify("  -- hello --  ", "1")).toBe("hello");
  });

  it("truncates to 80 characters", () => {
    const long = "a".repeat(100);
    expect(slugify(long, "1")).toHaveLength(80);
  });

  it("falls back to event-<id> for blank titles", () => {
    expect(slugify("", "99")).toBe("event-99");
    expect(slugify("   ---   ", "99")).toBe("event-99");
  });
});
