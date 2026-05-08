import { gql } from "graphql-request";
import { AuthorizationError } from "../../errors/index.ts";
import type { MeetupGraphqlClient } from "../client.ts";
import { MeetupQueryCost, throwMeetupRequestError } from "../client.ts";

const LIST_EVENTS = gql`
  query ListEvents($urlname: ID!, $first: Int!, $cursor: String, $status: String) {
    proNetwork(urlname: $urlname) {
      eventsSearch(input: { first: $first, after: $cursor, filter: { status: $status } }) {
        totalCount
        pageInfo {
          endCursor
        }
        edges {
          node {
            id
            title
          }
        }
      }
    }
  }
`;

type ListEventsResponse = {
  proNetwork: {
    eventsSearch: {
      totalCount: number;
      pageInfo: { endCursor: string | null };
      edges: Array<{ node: { id: string; title: string } }>;
    };
  } | null;
};

export type Event = {
  id: string;
  title: string;
};

export async function listEvents(
  client: MeetupGraphqlClient,
  networkUrlname: string,
  options?: { pageSize?: number; status?: string },
): Promise<Event[]> {
  const pageSize = options?.pageSize ?? 100;
  const events: Event[] = [];
  let cursor: string | undefined;
  const seenCursors = new Set<string>();

  try {
    for (;;) {
      const data = await client.request<ListEventsResponse>(
        LIST_EVENTS,
        { urlname: networkUrlname, first: pageSize, cursor, status: options?.status },
        { estimatedCost: MeetupQueryCost.eventsPage },
      );

      if (data.proNetwork === null) {
        throw new AuthorizationError(`Pro network "${networkUrlname}" not found or access denied`);
      }

      const search = data.proNetwork.eventsSearch;
      if (search.edges.length === 0) break;

      for (const edge of search.edges) {
        events.push({ id: edge.node.id, title: edge.node.title });
      }

      const endCursor = search.pageInfo.endCursor;
      if (!endCursor) break;
      if (seenCursors.has(endCursor)) throw new Error("cursor loop detected");
      seenCursors.add(endCursor);
      cursor = endCursor;
    }
  } catch (error) {
    if (error instanceof AuthorizationError) throw error;
    throwMeetupRequestError(error);
  }

  return events;
}
