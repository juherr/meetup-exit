import { describe, expect, it, vi } from "vitest";
import { AuthorizationError } from "../../src/errors/index.ts";
import { listGroups } from "../../src/meetup/functions/list-groups.ts";

function makeGroup(id: string) {
  return { id, name: `Group ${id}`, urlname: `group-${id}`, memberships: { totalCount: 10 } };
}

function makeSearchPage(
  nodes: ReturnType<typeof makeGroup>[],
  endCursor: string | null,
  totalCount = 100,
) {
  return {
    proNetwork: {
      groupsSearch: {
        totalCount,
        pageInfo: { endCursor },
        edges: nodes.map((node) => ({ node })),
      },
    },
  };
}

describe("listGroups", () => {
  it("returns all groups from a single page", async () => {
    const client = {
      request: vi.fn().mockResolvedValue(makeSearchPage([makeGroup("1"), makeGroup("2")], null, 2)),
      close: vi.fn(),
    };

    const groups = await listGroups(client as never, "my-network");

    expect(groups).toHaveLength(2);
    expect(client.request).toHaveBeenCalledOnce();
    expect(groups[0]).toMatchObject({
      id: "1",
      name: "Group 1",
      urlname: "group-1",
      membershipCount: 10,
    });
  });

  it("paginates across multiple pages", async () => {
    const client = {
      request: vi
        .fn()
        .mockResolvedValueOnce(makeSearchPage([makeGroup("1"), makeGroup("2")], "cursor-1"))
        .mockResolvedValueOnce(makeSearchPage([makeGroup("3")], null)),
      close: vi.fn(),
    };

    const groups = await listGroups(client as never, "my-network", { pageSize: 2 });

    expect(groups).toHaveLength(3);
    expect(client.request).toHaveBeenCalledTimes(2);
    const secondCall = client.request.mock.calls[1]![1] as { cursor?: string };
    expect(secondCall.cursor).toBe("cursor-1");
  });

  it("returns empty array when network has no groups", async () => {
    const client = {
      request: vi.fn().mockResolvedValue(makeSearchPage([], null, 0)),
      close: vi.fn(),
    };

    const groups = await listGroups(client as never, "empty-network");

    expect(groups).toHaveLength(0);
    expect(client.request).toHaveBeenCalledOnce();
  });

  it("throws AuthorizationError when proNetwork is null", async () => {
    const client = {
      request: vi.fn().mockResolvedValue({ proNetwork: null }),
      close: vi.fn(),
    };

    await expect(listGroups(client as never, "unknown-network")).rejects.toThrow(
      AuthorizationError,
    );
  });
});
