import { describe, expect, it, vi } from "vitest";
import { AuthenticationError, AuthorizationError } from "../../src/errors/index.ts";
import { getEventDetails } from "../../src/meetup/functions/get-event-details.ts";

function makeEventResponse(overrides?: Record<string, unknown>) {
  return {
    event: {
      id: "evt-1",
      title: "Test Event",
      eventUrl: "https://meetup.com/test/events/evt-1",
      description: "A great event",
      dateTime: "2026-06-01T19:00:00+02:00",
      duration: "PT2H",
      eventHosts: [{ memberId: "m-1", name: "Alice" }],
      featuredEventPhoto: { id: "photo-1", baseUrl: "https://example.com/photos/" },
      group: { id: "g-1", name: "My Group", urlname: "my-group" },
      ...overrides,
    },
  };
}

describe("getEventDetails", () => {
  it("returns full event details", async () => {
    const client = {
      request: vi.fn().mockResolvedValue(makeEventResponse()),
      close: vi.fn(),
    };

    const result = await getEventDetails(client as never, "evt-1");

    expect(result.id).toBe("evt-1");
    expect(result.title).toBe("Test Event");
    expect(result.eventHosts).toHaveLength(1);
    expect(result.eventHosts[0]).toEqual({ memberId: "m-1", name: "Alice" });
    expect(result.featuredEventPhoto).toEqual({
      id: "photo-1",
      baseUrl: "https://example.com/photos/",
    });
    expect(result.group).toEqual({ id: "g-1", name: "My Group", urlname: "my-group" });
  });

  it("handles null featuredEventPhoto", async () => {
    const client = {
      request: vi.fn().mockResolvedValue(makeEventResponse({ featuredEventPhoto: null })),
      close: vi.fn(),
    };

    const result = await getEventDetails(client as never, "evt-1");
    expect(result.featuredEventPhoto).toBeNull();
  });

  it("handles null group", async () => {
    const client = {
      request: vi.fn().mockResolvedValue(makeEventResponse({ group: null })),
      close: vi.fn(),
    };

    const result = await getEventDetails(client as never, "evt-1");
    expect(result.group).toBeNull();
  });

  it("throws AuthorizationError when event is null", async () => {
    const client = {
      request: vi.fn().mockResolvedValue({ event: null }),
      close: vi.fn(),
    };

    await expect(getEventDetails(client as never, "evt-1")).rejects.toThrow(AuthorizationError);
  });

  it("throws AuthenticationError on HTTP 401", async () => {
    const client = {
      request: vi.fn().mockRejectedValue({ response: { status: 401 } }),
      close: vi.fn(),
    };

    await expect(getEventDetails(client as never, "evt-1")).rejects.toThrow(AuthenticationError);
  });
});
