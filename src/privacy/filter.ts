import { stableHash } from "./hash.ts";
import type { PrivacyMode } from "./modes.ts";

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
      rsvpId: `rsvp_${stableHash(row.rsvpId, salt)}`,
      memberId: `member_${stableHash(row.memberId, salt)}`,
      memberName: `member_${stableHash(row.memberName, salt)}`,
      memberEmail: row.memberEmail ? `email_${stableHash(row.memberEmail, salt)}` : null,
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
      memberEmail: row.memberEmail ? `email_${stableHash(row.memberEmail, salt)}` : null,
      memberName: `member_${stableHash(row.memberName, salt)}`,
      rsvpId: `rsvp_${stableHash(row.rsvpId, salt)}`,
    };
  }
  return row;
}
