import { gql } from "graphql-request";
import type { MeetupGraphqlClient } from "../client.ts";
import { MeetupQueryCost, throwMeetupRequestError } from "../client.ts";

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
    throwMeetupRequestError(error);
  }
}
