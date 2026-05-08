import { gql } from "graphql-request";
import type { MeetupGraphqlClient } from "../client.ts";
import { MeetupQueryCost } from "../client.ts";
import { AuthenticationError } from "../../errors/index.ts";

const GET_SELF = gql`
  query GetSelf {
    self {
      id
      name
    }
  }
`;

type SelfResponse = {
  self: {
    id: string;
    name: string;
  };
};

export async function getSelf(client: MeetupGraphqlClient): Promise<{ id: string; name: string }> {
  try {
    const data = await client.request<SelfResponse>(GET_SELF, undefined, {
      estimatedCost: MeetupQueryCost.self,
    });
    return data.self;
  } catch (error) {
    const status = (error as { response?: { status?: number } }).response?.status;
    if (status === 401 || status === 403) {
      throw new AuthenticationError("Invalid or expired access token");
    }
    throw error;
  }
}
