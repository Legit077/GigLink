import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const acceptGigApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { appId: string }) => {
    if (!data?.appId || typeof data.appId !== "string") {
      throw new Error("Application ID is required");
    }
    return data;
  })
  .handler(async ({ data, context }) => {
    const { data: bookingId, error } = await context.supabase.rpc("accept_gig_application", {
      app_id: data.appId,
    });
    if (error) throw new Error(error.message);
    return { bookingId: bookingId as string | null };
  });
