import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { nptDaysBetween } from "./format";
import {
  canTransitionBooking,
  manualBlockedDates,
  rangesOverlap,
  type AvailabilityResult,
  type ConflictBooking,
} from "./booking-schemas";

type DB = SupabaseClient<Database>;

export const CONFLICT_MESSAGE =
  "This artist has just been booked for an overlapping event. Please choose another artist or time.";

export function parseWindow(eventStart: string, eventEnd: string): { start: Date; end: Date } {
  const start = new Date(eventStart);
  const end = new Date(eventEnd);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error("Please provide a valid event date and time.");
  }
  if (end <= start) {
    throw new Error("The event end time must be after the start time.");
  }
  return { start, end };
}

/**
 * Reads confirmed bookings with the service client so conflicts owned by OTHER
 * organizers are detected too. Only the time window is returned: no titles or
 * other details of someone else's booking leave the server.
 */
export async function findConfirmedConflicts(
  artistId: string,
  start: Date,
  end: Date,
  ignoreBookingId?: string,
): Promise<ConflictBooking[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("bookings")
    .select("id, event_start, event_end")
    .eq("artist_id", artistId)
    .eq("status", "confirmed")
    .lt("event_start", end.toISOString())
    .gt("event_end", start.toISOString());

  if (error) {
    console.error("conflict lookup failed", error);
    throw new Error("We could not check this artist's schedule. Please try again.");
  }

  return (data ?? [])
    .filter((b) => b.id !== ignoreBookingId)
    .filter((b) => rangesOverlap(start, end, new Date(b.event_start), new Date(b.event_end)));
}

/** Days in the window that the artist blocked by hand in their calendar. */
export async function findBlockedDates(
  db: DB,
  artistId: string,
  start: Date,
  end: Date,
): Promise<string[]> {
  const days = nptDaysBetween(start, end);
  const { data, error } = await db
    .from("artist_availability")
    .select("date, status, note")
    .eq("artist_id", artistId)
    .eq("status", "blocked")
    .gte("date", days[0]!)
    .lte("date", days[days.length - 1]!);

  if (error) {
    console.error("blocked-date lookup failed", error);
    throw new Error("We could not check this artist's schedule. Please try again.");
  }
  return manualBlockedDates(data ?? [], days);
}

export async function checkAvailability(
  artistId: string,
  eventStart: string,
  eventEnd: string,
  ignoreBookingId?: string,
): Promise<AvailabilityResult> {
  const { start, end } = parseWindow(eventStart, eventEnd);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: artist } = await supabaseAdmin
    .from("artists")
    .select("id")
    .eq("id", artistId)
    .maybeSingle();
  if (!artist) throw new Error("That artist could not be found.");

  const conflicts = await findConfirmedConflicts(artistId, start, end, ignoreBookingId);
  const blockedDates = await findBlockedDates(supabaseAdmin, artistId, start, end);
  return {
    available: conflicts.length === 0 && blockedDates.length === 0,
    conflicts,
    blockedDates,
  };
}

function isExclusionViolation(error: { code?: string | null; message?: string | null }): boolean {
  return error.code === "23P01" || (error.message ?? "").includes("no_overlapping_artist_bookings");
}

export async function createBooking(
  db: DB,
  userId: string,
  input: {
    artistId: string;
    venueId?: string | null | undefined;
    gigId?: string | null | undefined;
    title: string;
    eventStart: string;
    eventEnd: string;
    expectedAttendance: number;
    agreedPrice?: number | null | undefined;
    notes?: string | null | undefined;
  },
) {
  const { start, end } = parseWindow(input.eventStart, input.eventEnd);
  if (start.getTime() < Date.now()) {
    throw new Error("The event must start in the future.");
  }
  const blockedDates = await findBlockedDates(db, input.artistId, start, end);
  if (blockedDates.length > 0) {
    throw new Error(
      "This artist has marked part of that time as unavailable. Please choose another date.",
    );
  }
  if (!Number.isFinite(input.expectedAttendance) || input.expectedAttendance < 0) {
    throw new Error("Expected attendance must be zero or more.");
  }

  if (input.venueId) {
    const { data: venue } = await db
      .from("venues")
      .select("name, max_capacity")
      .eq("id", input.venueId)
      .maybeSingle();
    if (venue && input.expectedAttendance > venue.max_capacity) {
      throw new Error(
        `Expected guests (${input.expectedAttendance}) exceed ${venue.name}'s capacity of ${venue.max_capacity}.`,
      );
    }
  }

  const { data, error } = await db
    .from("bookings")
    .insert({
      artist_id: input.artistId,
      organizer_id: userId,
      venue_id: input.venueId ?? null,
      gig_id: input.gigId ?? null,
      title: input.title,
      event_start: input.eventStart,
      event_end: input.eventEnd,
      expected_attendance: input.expectedAttendance,
      agreed_price: input.agreedPrice ?? null,
      notes: input.notes ?? null,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) {
    console.error("booking insert failed", error);
    throw new Error("We could not send this booking request. Please try again.");
  }
  return { ok: true as const, bookingId: data.id };
}

export async function updateBookingStatus(
  db: DB,
  userId: string,
  bookingId: string,
  nextStatus: "confirmed" | "declined" | "cancelled" | "completed",
) {
  const { data: booking, error: readError } = await db
    .from("bookings")
    .select("id, artist_id, organizer_id, status, event_start, event_end, artists(user_id)")
    .eq("id", bookingId)
    .maybeSingle();

  if (readError || !booking) {
    throw new Error("That booking could not be found, or you do not have access to it.");
  }

  // Who is acting? Only the right party may make each move.
  const isArtist = booking.artists?.user_id === userId;
  const isOrganizer = booking.organizer_id === userId;
  if ((nextStatus === "confirmed" || nextStatus === "declined") && !isArtist) {
    throw new Error("Only the artist can confirm or decline a booking request.");
  }
  if (nextStatus === "completed" && !isOrganizer) {
    throw new Error("Only the organizer can mark a booking as completed.");
  }
  if (nextStatus === "cancelled" && !isArtist && !isOrganizer) {
    throw new Error("Only the artist or the organizer can cancel a booking.");
  }

  if (!canTransitionBooking(booking.status, nextStatus)) {
    throw new Error(`A ${booking.status} booking cannot be moved to ${nextStatus}.`);
  }
  if (nextStatus === "completed" && new Date(booking.event_end) > new Date()) {
    throw new Error("A booking can only be completed after the event has ended.");
  }

  if (nextStatus === "confirmed") {
    const { start, end } = parseWindow(booking.event_start, booking.event_end);
    const conflicts = await findConfirmedConflicts(booking.artist_id, start, end, booking.id);
    if (conflicts.length > 0) {
      return { ok: false as const, message: CONFLICT_MESSAGE, conflicts };
    }
  }

  const { error } = await db.from("bookings").update({ status: nextStatus }).eq("id", bookingId);

  if (error) {
    if (isExclusionViolation(error)) {
      return { ok: false as const, message: CONFLICT_MESSAGE, conflicts: [] };
    }
    console.error("booking status update failed", error);
    throw new Error("We could not update this booking. Please try again.");
  }

  return { ok: true as const, message: "Booking updated.", conflicts: [] };
}

export async function decideApplication(
  db: DB,
  userId: string,
  applicationId: string,
  decision: "accepted" | "rejected",
) {
  const { data: app, error } = await db
    .from("gig_applications")
    .select("id, status, artist_id, gig_id, quoted_price")
    .eq("id", applicationId)
    .maybeSingle();

  if (error || !app) {
    throw new Error("That application could not be found, or you do not have access to it.");
  }
  if (app.status !== "pending") {
    throw new Error(`This application has already been ${app.status}.`);
  }

  if (decision === "rejected") {
    const { error: rejErr } = await db
      .from("gig_applications")
      .update({ status: "rejected" })
      .eq("id", applicationId);
    if (rejErr) throw new Error("We could not update this application. Please try again.");
    return { ok: true as const, message: "Application rejected.", conflicts: [] };
  }

  const { data: gig } = await db
    .from("gigs")
    .select("id, organizer_id, status, event_start, event_end")
    .eq("id", app.gig_id)
    .maybeSingle();
  if (!gig) throw new Error("The gig for this application no longer exists.");
  if (gig.organizer_id !== userId) {
    throw new Error("Only the organizer who posted this gig can accept applications.");
  }
  if (gig.status !== "open") throw new Error("This gig is no longer open.");

  const { start, end } = parseWindow(gig.event_start, gig.event_end);
  const conflicts = await findConfirmedConflicts(app.artist_id, start, end);
  if (conflicts.length > 0) {
    return { ok: false as const, message: CONFLICT_MESSAGE, conflicts };
  }

  // One database transaction: create booking + mark accepted + reject the rest + close gig.
  const { error: acceptError } = await db.rpc("accept_gig_application", {
    _application_id: applicationId,
  });

  if (acceptError) {
    if (isExclusionViolation(acceptError)) {
      return { ok: false as const, message: CONFLICT_MESSAGE, conflicts: [] };
    }
    console.error("accept application failed", acceptError);
    throw new Error("We could not confirm this booking. Please try again.");
  }

  return {
    ok: true as const,
    message: "Application accepted and booking confirmed.",
    conflicts: [],
  };
}
