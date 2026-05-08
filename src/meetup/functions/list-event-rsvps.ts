import { gql } from "graphql-request";
import { AuthorizationError } from "../../errors/index.ts";
import type { MeetupGraphqlClient } from "../client.ts";
import { MeetupQueryCost, throwMeetupRequestError } from "../client.ts";

// NOTE: rsvps pagination via event(id) is unverified against real API;
// fallback to eventsSearch nesting may be needed if this shape is unsupported.
const LIST_EVENT_RSVPS = gql`
  query EventRsvps($eventId: ID!, $first: Int!, $cursor: String) {
    event(id: $eventId) {
      rsvps(input: { first: $first, after: $cursor }) {
        totalCount
        pageInfo {
          endCursor
        }
        edges {
          node {
            id
            member {
              id
              name
              email
            }
          }
        }
      }
    }
  }
`;

type ListEventRsvpsResponse = {
  event: {
    rsvps: {
      totalCount: number;
      pageInfo: { endCursor: string | null };
      edges: Array<{
        node: {
          id: string;
          member: { id: string; name: string; email: string | null };
        };
      }>;
    };
  } | null;
};

export type Rsvp = {
  id: string;
  memberId: string;
  memberName: string;
  memberEmail: string | null;
};

export async function listEventRsvps(
  client: MeetupGraphqlClient,
  eventId: string,
  options?: { pageSize?: number },
): Promise<Rsvp[]> {
  const pageSize = options?.pageSize ?? 100;
  const rsvps: Rsvp[] = [];
  let cursor: string | undefined;
  const seenCursors = new Set<string>();

  try {
    for (;;) {
      const data = await client.request<ListEventRsvpsResponse>(
        LIST_EVENT_RSVPS,
        { eventId, first: pageSize, cursor },
        { estimatedCost: MeetupQueryCost.eventRsvpsPage },
      );

      if (data.event === null) {
        throw new AuthorizationError(`Event "${eventId}" not found or access denied`);
      }

      const page = data.event.rsvps;
      if (page.edges.length === 0) break;

      for (const edge of page.edges) {
        rsvps.push({
          id: edge.node.id,
          memberId: edge.node.member.id,
          memberName: edge.node.member.name,
          memberEmail: edge.node.member.email,
        });
      }

      const endCursor = page.pageInfo.endCursor;
      if (!endCursor) break;
      if (seenCursors.has(endCursor)) throw new Error("cursor loop detected");
      seenCursors.add(endCursor);
      cursor = endCursor;
    }
  } catch (error) {
    if (error instanceof AuthorizationError) throw error;
    throwMeetupRequestError(error);
  }

  return rsvps;
}
