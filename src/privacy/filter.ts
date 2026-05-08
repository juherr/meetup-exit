import { stableHash } from "./hash.ts";
import type { PrivacyMode } from "./modes.ts";

export const PSEUDONYM_PREFIXES = {
  member: "member_",
  email: "email_",
  rsvp: "rsvp_",
} as const;

export type RsvpPrivacyTarget = {
  eventId: string;
  rsvpId: string;
  memberId: string;
  memberName: string;
  memberEmail: string | null;
};

export type AttendeePrivacyTarget = {
  memberEmail: string | null;
  memberName: string;
  eventId: string;
  eventTitle: string;
  eventDateTime: string;
  rsvpId: string;
};

export function applyRsvpPrivacy(
  row: RsvpPrivacyTarget,
  privacyMode: PrivacyMode,
  salt?: string,
): RsvpPrivacyTarget {
  if (privacyMode === "no-email") {
    return { ...row, memberEmail: null };
  }
  if (privacyMode === "pseudonymized" && salt) {
    return {
      ...row,
      rsvpId: `${PSEUDONYM_PREFIXES.rsvp}${stableHash(row.rsvpId, salt)}`,
      memberId: `${PSEUDONYM_PREFIXES.member}${stableHash(row.memberId, salt)}`,
      memberName: `${PSEUDONYM_PREFIXES.member}${stableHash(row.memberName, salt)}`,
      memberEmail: row.memberEmail
        ? `${PSEUDONYM_PREFIXES.email}${stableHash(row.memberEmail, salt)}`
        : null,
    };
  }
  return row;
}

export function applyAttendeePrivacy(
  row: AttendeePrivacyTarget,
  privacyMode: PrivacyMode,
  salt?: string,
): AttendeePrivacyTarget {
  if (privacyMode === "no-email") {
    return { ...row, memberEmail: null };
  }
  if (privacyMode === "pseudonymized" && salt) {
    return {
      ...row,
      memberEmail: row.memberEmail
        ? `${PSEUDONYM_PREFIXES.email}${stableHash(row.memberEmail, salt)}`
        : null,
      memberName: `${PSEUDONYM_PREFIXES.member}${stableHash(row.memberName, salt)}`,
      rsvpId: `${PSEUDONYM_PREFIXES.rsvp}${stableHash(row.rsvpId, salt)}`,
    };
  }
  return row;
}
