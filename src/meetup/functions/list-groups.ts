import { gql } from "graphql-request";
import { AuthorizationError } from "../../errors/index.ts";
import type { MeetupGraphqlClient } from "../client.ts";
import { MeetupQueryCost, throwMeetupRequestError } from "../client.ts";

const LIST_GROUPS = gql`
  query ListGroups($urlname: ID!, $first: Int!, $cursor: String) {
    proNetwork(urlname: $urlname) {
      groupsSearch(input: { first: $first, after: $cursor, filter: {} }) {
        totalCount
        pageInfo {
          endCursor
        }
        edges {
          node {
            id
            name
            urlname
            memberships {
              totalCount
            }
          }
        }
      }
    }
  }
`;

type ListGroupsResponse = {
  proNetwork: {
    groupsSearch: {
      totalCount: number;
      pageInfo: { endCursor: string | null };
      edges: Array<{
        node: {
          id: string;
          name: string;
          urlname: string;
          memberships: { totalCount: number };
        };
      }>;
    };
  } | null;
};

export type Group = {
  id: string;
  name: string;
  urlname: string;
  membershipCount: number;
};

export async function listGroups(
  client: MeetupGraphqlClient,
  networkUrlname: string,
  options?: { pageSize?: number },
): Promise<Group[]> {
  const pageSize = options?.pageSize ?? 100;
  const groups: Group[] = [];
  let cursor: string | undefined;
  const seenCursors = new Set<string>();

  try {
    for (;;) {
      const data = await client.request<ListGroupsResponse>(
        LIST_GROUPS,
        { urlname: networkUrlname, first: pageSize, cursor },
        { estimatedCost: MeetupQueryCost.groupsPage },
      );

      if (data.proNetwork === null) {
        throw new AuthorizationError(`Pro network "${networkUrlname}" not found or access denied`);
      }

      const search = data.proNetwork.groupsSearch;
      if (search.edges.length === 0) break;

      for (const edge of search.edges) {
        groups.push({
          id: edge.node.id,
          name: edge.node.name,
          urlname: edge.node.urlname,
          membershipCount: edge.node.memberships.totalCount,
        });
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

  return groups;
}
