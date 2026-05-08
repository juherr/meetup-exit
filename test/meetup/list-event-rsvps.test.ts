import { describe, expect, it, vi } from "vitest";
import { AuthorizationError } from "../../src/errors/index.ts";
import { listEventRsvps } from "../../src/meetup/functions/list-event-rsvps.ts";

function makeRsvpPage(
  nodes: Array<{ id: string; member: { id: string; name: string; email: string | null } }>,
  endCursor: string | null,
  totalCount = nodes.length,
) {
  return {
    event: {
      rsvps: {
        totalCount,
        pageInfo: { endCursor },
        edges: nodes.map((node) => ({ node })),
      },
    },
  };
}

describe("listEventRsvps", () => {
  it("returns RSVPs from a single page", async () => {
    const client = {
      request: vi.fn().mockResolvedValue(
        makeRsvpPage(
          [
            { id: "r-1", member: { id: "m-1", name: "Alice", email: "alice@example.com" } },
            { id: "r-2", member: { id: "m-2", name: "Bob", email: null } },
          ],
          null,
          2,
        ),
      ),
      close: vi.fn(),
    };

    const result = await listEventRsvps(client as never, "evt-1");

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      id: "r-1",
      memberId: "m-1",
      memberName: "Alice",
      memberEmail: "alice@example.com",
    });
    expect(result[1]).toEqual({ id: "r-2", memberId: "m-2", memberName: "Bob", memberEmail: null });
  });

  it("paginates across multiple pages", async () => {
    const client = {
      request: vi
        .fn()
        .mockResolvedValueOnce(
          makeRsvpPage(
            [{ id: "r-1", member: { id: "m-1", name: "Alice", email: null } }],
            "cursor-1",
            2,
          ),
        )
        .mockResolvedValueOnce(
          makeRsvpPage([{ id: "r-2", member: { id: "m-2", name: "Bob", email: null } }], null, 2),
        ),
      close: vi.fn(),
    };

    const result = await listEventRsvps(client as never, "evt-1");

    expect(result).toHaveLength(2);
    expect(client.request).toHaveBeenCalledTimes(2);
    const secondCall = client.request.mock.calls[1]![1] as { cursor?: string };
    expect(secondCall.cursor).toBe("cursor-1");
  });

  it("throws AuthorizationError when event is null", async () => {
    const client = {
      request: vi.fn().mockResolvedValue({ event: null }),
      close: vi.fn(),
    };

    await expect(listEventRsvps(client as never, "evt-1")).rejects.toThrow(AuthorizationError);
  });
});
