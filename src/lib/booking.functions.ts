import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  applicationDecisionSchema,
  availabilityCheckSchema,
  bookingDecisionSchema,
  bookingRequestSchema,
} from "./booking-schemas";

export const checkArtistAvailability = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => availabilityCheckSchema.parse(input))
  .handler(async ({ data }) => {
    const { checkAvailability } = await import("./booking.server");
    return checkAvailability(data.artistId, data.eventStart, data.eventEnd, data.ignoreBookingId);
  });

export const requestBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => bookingRequestSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { createBooking } = await import("./booking.server");
    return createBooking(context.supabase, context.userId, data);
  });

export const setBookingStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => bookingDecisionSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { updateBookingStatus } = await import("./booking.server");
    return updateBookingStatus(context.supabase, context.userId, data.bookingId, data.status);
  });

export const reviewApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => applicationDecisionSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { decideApplication } = await import("./booking.server");
    return decideApplication(context.supabase, context.userId, data.applicationId, data.decision);
  });
