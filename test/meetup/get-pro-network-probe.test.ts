import { describe, expect, it, vi } from "vitest";
import { AuthenticationError, AuthorizationError } from "../../src/errors/index.ts";
import { getProNetworkProbe } from "../../src/meetup/functions/get-pro-network-probe.ts";

function makeClient(response: unknown) {
  return { request: vi.fn().mockResolvedValue(response), close: vi.fn() };
}

const sampleResponse = {
  proNetwork: {
    groupsSearch: {
      totalCount: 42,
      edges: [
        { node: { id: "1", name: "Group A", urlname: "group-a" } },
        { node: { id: "2", name: "Group B", urlname: "group-b" } },
      ],
    },
  },
};

describe("getProNetworkProbe", () => {
  it("returns totalCount and sampleGroups on success", async () => {
    const client = makeClient(sampleResponse);
    const result = await getProNetworkProbe(client as never, "my-network");

    expect(result.totalCount).toBe(42);
    expect(result.sampleGroups).toHaveLength(2);
    expect(result.sampleGroups[0]).toEqual({ id: "1", name: "Group A", urlname: "group-a" });
  });

  it("throws AuthorizationError when proNetwork is null", async () => {
    const client = makeClient({ proNetwork: null });
    await expect(getProNetworkProbe(client as never, "unknown-network")).rejects.toThrow(
      AuthorizationError,
    );
  });

  it("throws AuthenticationError on 401 response", async () => {
    const client = {
      request: vi.fn().mockRejectedValue({ response: { status: 401 } }),
      close: vi.fn(),
    };
    await expect(getProNetworkProbe(client as never, "my-network")).rejects.toThrow(
      AuthenticationError,
    );
  });
});
