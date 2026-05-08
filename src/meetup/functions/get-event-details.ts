import { gql } from "graphql-request";
import { AuthorizationError } from "../../errors/index.ts";
import type { MeetupGraphqlClient } from "../client.ts";
import { MeetupQueryCost, throwMeetupRequestError } from "../client.ts";

const GET_EVENT_DETAILS = gql`
  query EventDetails($eventId: ID!) {
    event(id: $eventId) {
      id
      title
      eventUrl
      description
      dateTime
      duration
      eventHosts {
        memberId
        name
      }
      featuredEventPhoto {
        id
        baseUrl
      }
      group {
        id
        name
        urlname
      }
    }
  }
`;

type GetEventDetailsResponse = {
  event: {
    id: string;
    title: string;
    eventUrl: string;
    description: string;
    dateTime: string;
    duration: string;
    eventHosts: Array<{ memberId: string; name: string }>;
    featuredEventPhoto: { id: string; baseUrl: string } | null;
    group: { id: string; name: string; urlname: string } | null;
  } | null;
};

export type EventDetails = {
  id: string;
  title: string;
  eventUrl: string;
  description: string;
  dateTime: string;
  duration: string;
  eventHosts: Array<{ memberId: string; name: string }>;
  featuredEventPhoto: { id: string; baseUrl: string } | null;
  group: { id: string; name: string; urlname: string } | null;
};

export async function getEventDetails(
  client: MeetupGraphqlClient,
  eventId: string,
): Promise<EventDetails> {
  try {
    const data = await client.request<GetEventDetailsResponse>(
      GET_EVENT_DETAILS,
      { eventId },
      { estimatedCost: MeetupQueryCost.eventDetails },
    );

    if (data.event === null) {
      throw new AuthorizationError(`Event "${eventId}" not found or access denied`);
    }

    return data.event;
  } catch (error) {
    if (error instanceof AuthorizationError) throw error;
    throwMeetupRequestError(error);
  }
}
