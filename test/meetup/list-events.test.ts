import { describe, expect, it, vi } from "vitest";
import { AuthenticationError, AuthorizationError } from "../../src/errors/index.ts";
import { listEvents } from "../../src/meetup/functions/list-events.ts";

function makeEventPage(
  nodes: Array<{ id: string; title: string }>,
  endCursor: string | null,
  totalCount = nodes.length,
) {
  return {
    proNetwork: {
      eventsSearch: {
        totalCount,
        pageInfo: { endCursor },
        edges: nodes.map((node) => ({ node })),
      },
    },
  };
}

describe("listEvents", () => {
  it("returns events from a single page", async () => {
    const client = {
      request: vi.fn().mockResolvedValue(
        makeEventPage(
          [
            { id: "1", title: "Event A" },
            { id: "2", title: "Event B" },
          ],
          null,
          2,
        ),
      ),
      close: vi.fn(),
    };

    const result = await listEvents(client as never, "my-network");

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ id: "1", title: "Event A" });
    expect(result[1]).toEqual({ id: "2", title: "Event B" });
    expect(client.request).toHaveBeenCalledOnce();
  });

  it("paginates across multiple pages", async () => {
    const client = {
      request: vi
        .fn()
        .mockResolvedValueOnce(makeEventPage([{ id: "1", title: "Event A" }], "cursor-1", 2))
        .mockResolvedValueOnce(makeEventPage([{ id: "2", title: "Event B" }], null, 2)),
      close: vi.fn(),
    };

    const result = await listEvents(client as never, "my-network");

    expect(result).toHaveLength(2);
    expect(client.request).toHaveBeenCalledTimes(2);
    const secondCall = client.request.mock.calls[1]![1] as { cursor?: string };
    expect(secondCall.cursor).toBe("cursor-1");
  });

  it("passes status option to the query", async () => {
    const client = {
      request: vi.fn().mockResolvedValue(makeEventPage([], null, 0)),
      close: vi.fn(),
    };

    await listEvents(client as never, "my-network", { status: "UPCOMING" });

    const vars = client.request.mock.calls[0]![1] as { status?: string };
    expect(vars.status).toBe("UPCOMING");
  });

  it("throws AuthorizationError when proNetwork is null", async () => {
    const client = {
      request: vi.fn().mockResolvedValue({ proNetwork: null }),
      close: vi.fn(),
    };

    await expect(listEvents(client as never, "my-network")).rejects.toThrow(AuthorizationError);
  });

  it("throws AuthenticationError on HTTP 401", async () => {
    const client = {
      request: vi.fn().mockRejectedValue({ response: { status: 401 } }),
      close: vi.fn(),
    };

    await expect(listEvents(client as never, "my-network")).rejects.toThrow(AuthenticationError);
  });
});
