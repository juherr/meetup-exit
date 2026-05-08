import { gql } from "graphql-request";
import { AuthorizationError } from "../../errors/index.ts";
import type { MeetupGraphqlClient } from "../client.ts";
import { MeetupQueryCost, throwMeetupRequestError } from "../client.ts";

const LIST_EVENT_REGISTRATION_ANSWERS = gql`
  query EventRegistrationAnswers($urlname: ID!, $eventId: ID!, $first: Int!, $cursor: String) {
    proNetwork(urlname: $urlname) {
      eventRegistrationAnswers(
        input: { first: $first, after: $cursor, filter: { eventIds: [$eventId] } }
      ) {
        totalCount
        pageInfo {
          endCursor
        }
        edges {
          node {
            answers {
              question
              answer
            }
          }
        }
      }
    }
  }
`;

type ListEventRegistrationAnswersResponse = {
  proNetwork: {
    eventRegistrationAnswers: {
      totalCount: number;
      pageInfo: { endCursor: string | null };
      edges: Array<{
        node: {
          answers: Array<{ question: string; answer: string }>;
        };
      }>;
    };
  } | null;
};

export type RegistrationAnswer = {
  question: string;
  answer: string;
};

export async function listEventRegistrationAnswers(
  client: MeetupGraphqlClient,
  networkUrlname: string,
  eventId: string,
  options?: { pageSize?: number },
): Promise<RegistrationAnswer[]> {
  const pageSize = options?.pageSize ?? 100;
  const answers: RegistrationAnswer[] = [];
  let cursor: string | undefined;
  const seenCursors = new Set<string>();

  try {
    for (;;) {
      const data = await client.request<ListEventRegistrationAnswersResponse>(
        LIST_EVENT_REGISTRATION_ANSWERS,
        { urlname: networkUrlname, eventId, first: pageSize, cursor },
        { estimatedCost: MeetupQueryCost.registrationAnswersPage },
      );

      if (data.proNetwork === null) {
        throw new AuthorizationError(`Pro network "${networkUrlname}" not found or access denied`);
      }

      const page = data.proNetwork.eventRegistrationAnswers;
      if (page.edges.length === 0) break;

      for (const edge of page.edges) {
        for (const qa of edge.node.answers) {
          answers.push({ question: qa.question, answer: qa.answer });
        }
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

  return answers;
}
