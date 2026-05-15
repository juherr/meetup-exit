import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  loadResumeIndex,
  saveResumeIndex,
  markEntityTypeComplete,
} from "../../src/export/resume-index.ts";
import type { ResumeIndex } from "../../src/export/resume-index.ts";

describe("resume-index", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "resume-index-test-"));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true });
  });

  describe("loadResumeIndex", () => {
    it("returns empty fallback when .meetup-exit/ does not exist", async () => {
      const fallback = "2026-05-15T10:00:00.000Z";
      const result = await loadResumeIndex(tmpDir, fallback);
      expect(result).toEqual({
        version: 1,
        exportedAt: fallback,
        completedEntityTypes: [],
      });
    });

    it("returns empty fallback when index.json does not exist", async () => {
      await mkdir(join(tmpDir, ".meetup-exit"), { recursive: true });
      const fallback = "2026-05-15T10:00:00.000Z";
      const result = await loadResumeIndex(tmpDir, fallback);
      expect(result).toEqual({
        version: 1,
        exportedAt: fallback,
        completedEntityTypes: [],
      });
    });

    it("returns empty fallback when index.json contains malformed JSON", async () => {
      await mkdir(join(tmpDir, ".meetup-exit"), { recursive: true });
      await writeFile(join(tmpDir, ".meetup-exit", "index.json"), "not-json", "utf-8");
      const fallback = "2026-05-15T10:00:00.000Z";
      const result = await loadResumeIndex(tmpDir, fallback);
      expect(result).toEqual({
        version: 1,
        exportedAt: fallback,
        completedEntityTypes: [],
      });
    });

    it("returns parsed index when valid JSON exists", async () => {
      const index: ResumeIndex = {
        version: 1,
        exportedAt: "2026-05-15T09:00:00.000Z",
        completedEntityTypes: ["groups", "events"],
      };
      await mkdir(join(tmpDir, ".meetup-exit"), { recursive: true });
      await writeFile(
        join(tmpDir, ".meetup-exit", "index.json"),
        JSON.stringify(index, null, 2),
        "utf-8",
      );
      const fallback = "2026-05-15T10:00:00.000Z";
      const result = await loadResumeIndex(tmpDir, fallback);
      expect(result).toEqual(index);
    });
  });

  describe("saveResumeIndex + loadResumeIndex round-trip", () => {
    it("round-trips a partial completion index correctly", async () => {
      const index: ResumeIndex = {
        version: 1,
        exportedAt: "2026-05-15T09:00:00.000Z",
        completedEntityTypes: ["groups", "events"],
      };
      await saveResumeIndex(tmpDir, index);
      const loaded = await loadResumeIndex(tmpDir, "fallback");
      expect(loaded).toEqual(index);
    });

    it("round-trips an empty completedEntityTypes correctly", async () => {
      const index: ResumeIndex = {
        version: 1,
        exportedAt: "2026-05-15T09:00:00.000Z",
        completedEntityTypes: [],
      };
      await saveResumeIndex(tmpDir, index);
      const loaded = await loadResumeIndex(tmpDir, "fallback");
      expect(loaded).toEqual(index);
    });
  });

  describe("markEntityTypeComplete", () => {
    it("appends a new entity type", () => {
      const index: ResumeIndex = {
        version: 1,
        exportedAt: "2026-05-15T09:00:00.000Z",
        completedEntityTypes: [],
      };
      const result = markEntityTypeComplete(index, "groups");
      expect(result.completedEntityTypes).toEqual(["groups"]);
    });

    it("is idempotent — calling twice with the same type produces only one entry", () => {
      const index: ResumeIndex = {
        version: 1,
        exportedAt: "2026-05-15T09:00:00.000Z",
        completedEntityTypes: [],
      };
      const once = markEntityTypeComplete(index, "groups");
      const twice = markEntityTypeComplete(once, "groups");
      expect(twice.completedEntityTypes).toEqual(["groups"]);
      expect(twice.completedEntityTypes).toHaveLength(1);
    });

    it("appends a second distinct type", () => {
      const index: ResumeIndex = {
        version: 1,
        exportedAt: "2026-05-15T09:00:00.000Z",
        completedEntityTypes: ["groups"],
      };
      const result = markEntityTypeComplete(index, "events");
      expect(result.completedEntityTypes).toEqual(["groups", "events"]);
    });

    it("does not mutate the original index", () => {
      const original: ResumeIndex = {
        version: 1,
        exportedAt: "2026-05-15T09:00:00.000Z",
        completedEntityTypes: [],
      };
      markEntityTypeComplete(original, "groups");
      expect(original.completedEntityTypes).toEqual([]);
    });
  });
});
