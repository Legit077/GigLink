import { z } from "zod";

export const availabilityCheckSchema = z.object({
  artistId: z.string().uuid("Please select a valid artist."),
  eventStart: z.string().min(1, "Start time is required."),
  eventEnd: z.string().min(1, "End time is required."),
  ignoreBookingId: z.string().uuid().optional(),
});

export const bookingRequestSchema = z.object({
  artistId: z.string().uuid("Please select a valid artist."),
  venueId: z.string().uuid().optional().nullable(),
  gigId: z.string().uuid().optional().nullable(),
  title: z.string().trim().min(3, "Event name must be at least 3 characters."),
  eventStart: z.string().min(1, "Start time is required."),
  eventEnd: z.string().min(1, "End time is required."),
  expectedAttendance: z.number().int().min(0, "Attendance cannot be negative."),
  agreedPrice: z.number().min(0, "Budget cannot be negative.").optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const bookingDecisionSchema = z.object({
  bookingId: z.string().uuid(),
  status: z.enum(["confirmed", "declined", "cancelled", "completed"]),
});

export const applicationDecisionSchema = z.object({
  applicationId: z.string().uuid(),
  decision: z.enum(["accepted", "rejected"]),
});

export type ConflictBooking = {
  id: string;
  event_start: string;
  event_end: string;
};

export type AvailabilityResult = {
  available: boolean;
  conflicts: ConflictBooking[];
  /** Days (YYYY-MM-DD, Nepal time) the artist marked unavailable by hand. */
  blockedDates: string[];
};

/** Calendar note the database trigger puts on days blocked by a confirmed booking. */
export const BOOKING_BLOCK_NOTE = "Confirmed booking";

/**
 * Days the artist blocked manually. Days blocked by a confirmed booking are
 * ignored here: those are handled by the time-overlap check, so an artist can
 * still take a second, non-overlapping event on the same day.
 */
export function manualBlockedDates(
  rows: { date: string; status: string; note: string | null }[],
  days: string[],
): string[] {
  const wanted = new Set(days);
  return rows
    .filter((r) => r.status === "blocked" && r.note !== BOOKING_BLOCK_NOTE && wanted.has(r.date))
    .map((r) => r.date)
    .sort();
}

/** Valid booking state transitions (state machine). */
export const BOOKING_TRANSITIONS: Record<string, string[]> = {
  pending: ["confirmed", "declined", "cancelled"],
  confirmed: ["completed", "cancelled"],
  declined: [],
  cancelled: [],
  completed: [],
};

export function canTransitionBooking(from: string, to: string): boolean {
  return (BOOKING_TRANSITIONS[from] ?? []).includes(to);
}

/** Ranges that only touch at a boundary do NOT overlap. */
export function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}
