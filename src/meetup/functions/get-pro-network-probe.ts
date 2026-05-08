import { gql } from "graphql-request";
import { AuthorizationError } from "../../errors/index.ts";
import type { MeetupGraphqlClient } from "../client.ts";
import { MeetupQueryCost, throwMeetupRequestError } from "../client.ts";

const PRO_NETWORK_PROBE = gql`
  query ProNetworkProbe($urlname: ID!) {
    proNetwork(urlname: $urlname) {
      groupsSearch(input: { first: 3, filter: {} }) {
        totalCount
        edges {
          node {
            id
            name
            urlname
          }
        }
      }
    }
  }
`;

type ProNetworkProbeResponse = {
  proNetwork: {
    groupsSearch: {
      totalCount: number;
      edges: Array<{ node: { id: string; name: string; urlname: string } }>;
    };
  } | null;
};

export type ProNetworkProbeResult = {
  totalCount: number;
  sampleGroups: Array<{ id: string; name: string; urlname: string }>;
};

export async function getProNetworkProbe(
  client: MeetupGraphqlClient,
  networkUrlname: string,
): Promise<ProNetworkProbeResult> {
  try {
    const data = await client.request<ProNetworkProbeResponse>(
      PRO_NETWORK_PROBE,
      { urlname: networkUrlname },
      { estimatedCost: MeetupQueryCost.proNetworkProbe },
    );

    if (data.proNetwork === null) {
      throw new AuthorizationError(`Pro network "${networkUrlname}" not found or access denied`);
    }

    return {
      totalCount: data.proNetwork.groupsSearch.totalCount,
      sampleGroups: data.proNetwork.groupsSearch.edges.map((e) => e.node),
    };
  } catch (error) {
    if (error instanceof AuthorizationError) throw error;
    throwMeetupRequestError(error);
  }
}
