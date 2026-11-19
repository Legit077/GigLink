import { describe, expect, it } from "vitest";
import {
  BOOKING_TRANSITIONS,
  bookingRequestSchema,
  canTransitionBooking,
  manualBlockedDates,
  rangesOverlap,
} from "./booking-schemas";

const at = (iso: string) => new Date(iso);

describe("rangesOverlap", () => {
  it("detects a partial overlap", () => {
    expect(
      rangesOverlap(
        at("2026-11-01T18:00Z"),
        at("2026-11-01T21:00Z"),
        at("2026-11-01T20:00Z"),
        at("2026-11-01T23:00Z"),
      ),
    ).toBe(true);
  });

  it("detects one range fully inside another", () => {
    expect(
      rangesOverlap(
        at("2026-11-01T17:00Z"),
        at("2026-11-01T23:00Z"),
        at("2026-11-01T19:00Z"),
        at("2026-11-01T20:00Z"),
      ),
    ).toBe(true);
  });

  it("treats back-to-back events as NOT overlapping", () => {
    expect(
      rangesOverlap(
        at("2026-11-01T18:00Z"),
        at("2026-11-01T20:00Z"),
        at("2026-11-01T20:00Z"),
        at("2026-11-01T22:00Z"),
      ),
    ).toBe(false);
  });

  it("returns false for separate days", () => {
    expect(
      rangesOverlap(
        at("2026-11-01T18:00Z"),
        at("2026-11-01T20:00Z"),
        at("2026-11-02T18:00Z"),
        at("2026-11-02T20:00Z"),
      ),
    ).toBe(false);
  });
});

describe("canTransitionBooking", () => {
  it("allows the normal flow", () => {
    expect(canTransitionBooking("pending", "confirmed")).toBe(true);
    expect(canTransitionBooking("pending", "declined")).toBe(true);
    expect(canTransitionBooking("confirmed", "completed")).toBe(true);
    expect(canTransitionBooking("confirmed", "cancelled")).toBe(true);
  });

  it("blocks skipping steps", () => {
    expect(canTransitionBooking("pending", "completed")).toBe(false);
    expect(canTransitionBooking("declined", "confirmed")).toBe(false);
  });

  it("treats final states as final", () => {
    for (const final of ["declined", "cancelled", "completed"]) {
      expect(BOOKING_TRANSITIONS[final]).toEqual([]);
      expect(canTransitionBooking(final, "confirmed")).toBe(false);
    }
  });

  it("rejects unknown statuses", () => {
    expect(canTransitionBooking("nonsense", "confirmed")).toBe(false);
  });
});

describe("bookingRequestSchema", () => {
  const valid = {
    artistId: "22222222-2222-4222-8222-000000000003",
    title: "Friday Night Live",
    eventStart: "2026-11-01T18:00:00Z",
    eventEnd: "2026-11-01T21:00:00Z",
    expectedAttendance: 80,
  };

  it("accepts a valid request", () => {
    expect(bookingRequestSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a short title and negative attendance", () => {
    expect(bookingRequestSchema.safeParse({ ...valid, title: "ab" }).success).toBe(false);
    expect(bookingRequestSchema.safeParse({ ...valid, expectedAttendance: -1 }).success).toBe(
      false,
    );
  });

  it("rejects a non-uuid artist id", () => {
    expect(bookingRequestSchema.safeParse({ ...valid, artistId: "abc" }).success).toBe(false);
  });
});

describe("manualBlockedDates", () => {
  const rows = [
    { date: "2026-11-02", status: "blocked", note: null },
    { date: "2026-11-03", status: "blocked", note: "Confirmed booking" },
    { date: "2026-11-04", status: "open", note: null },
    { date: "2026-11-09", status: "blocked", note: "Family event" },
  ];

  it("returns only hand-blocked days inside the window", () => {
    expect(manualBlockedDates(rows, ["2026-11-02", "2026-11-03", "2026-11-04"])).toEqual([
      "2026-11-02",
    ]);
  });

  it("ignores blocked days outside the window", () => {
    expect(manualBlockedDates(rows, ["2026-11-05"])).toEqual([]);
  });

  it("does not treat days blocked by a confirmed booking as manual blocks", () => {
    expect(manualBlockedDates(rows, ["2026-11-03"])).toEqual([]);
  });
});
