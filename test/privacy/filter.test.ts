import { describe, expect, it } from "vitest";
import { applyRsvpPrivacy, applyAttendeePrivacy } from "../../src/privacy/filter.ts";
import type { RsvpPrivacyTarget, AttendeePrivacyTarget } from "../../src/privacy/filter.ts";

const rsvpRow: RsvpPrivacyTarget = {
  eventId: "evt1",
  rsvpId: "rsvp1",
  memberId: "mem1",
  memberName: "Alice Smith",
  memberEmail: "alice@example.com",
};

const attendeeRow: AttendeePrivacyTarget = {
  memberEmail: "alice@example.com",
  memberName: "Alice Smith",
  eventId: "evt1",
  eventTitle: "My Event",
  eventDateTime: "2026-05-01T18:00:00",
  rsvpId: "rsvp1",
};

describe("applyRsvpPrivacy", () => {
  it("full mode returns row unchanged", () => {
    expect(applyRsvpPrivacy(rsvpRow, "full")).toEqual(rsvpRow);
  });

  it("no-email mode strips memberEmail", () => {
    const result = applyRsvpPrivacy(rsvpRow, "no-email");
    expect(result.memberEmail).toBeNull();
    expect(result.memberId).toBe(rsvpRow.memberId);
    expect(result.memberName).toBe(rsvpRow.memberName);
  });

  it("pseudonymized mode hashes all PII fields", () => {
    const result = applyRsvpPrivacy(rsvpRow, "pseudonymized", "testsalt");
    expect(result.rsvpId).toMatch(/^rsvp_[0-9a-f]{12}$/);
    expect(result.memberId).toMatch(/^member_[0-9a-f]{12}$/);
    expect(result.memberName).toMatch(/^member_[0-9a-f]{12}$/);
    expect(result.memberEmail).toMatch(/^email_[0-9a-f]{12}$/);
    expect(result.eventId).toBe(rsvpRow.eventId);
  });

  it("pseudonymized mode without salt returns row unchanged", () => {
    expect(applyRsvpPrivacy(rsvpRow, "pseudonymized")).toEqual(rsvpRow);
  });

  it("pseudonymized mode with null email keeps null", () => {
    const rowNoEmail = { ...rsvpRow, memberEmail: null };
    const result = applyRsvpPrivacy(rowNoEmail, "pseudonymized", "testsalt");
    expect(result.memberEmail).toBeNull();
  });

  it("produces stable hashes for same input", () => {
    const a = applyRsvpPrivacy(rsvpRow, "pseudonymized", "testsalt");
    const b = applyRsvpPrivacy(rsvpRow, "pseudonymized", "testsalt");
    expect(a.memberId).toBe(b.memberId);
  });
});

describe("applyAttendeePrivacy", () => {
  it("full mode returns row unchanged", () => {
    expect(applyAttendeePrivacy(attendeeRow, "full")).toEqual(attendeeRow);
  });

  it("no-email mode strips memberEmail", () => {
    const result = applyAttendeePrivacy(attendeeRow, "no-email");
    expect(result.memberEmail).toBeNull();
    expect(result.memberName).toBe(attendeeRow.memberName);
    expect(result.eventId).toBe(attendeeRow.eventId);
  });

  it("pseudonymized mode hashes PII fields", () => {
    const result = applyAttendeePrivacy(attendeeRow, "pseudonymized", "testsalt");
    expect(result.memberEmail).toMatch(/^email_[0-9a-f]{12}$/);
    expect(result.memberName).toMatch(/^member_[0-9a-f]{12}$/);
    expect(result.rsvpId).toMatch(/^rsvp_[0-9a-f]{12}$/);
    expect(result.eventId).toBe(attendeeRow.eventId);
    expect(result.eventTitle).toBe(attendeeRow.eventTitle);
  });

  it("pseudonymized mode without salt returns row unchanged", () => {
    expect(applyAttendeePrivacy(attendeeRow, "pseudonymized")).toEqual(attendeeRow);
  });
});
