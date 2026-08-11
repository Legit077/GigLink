import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Users } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export type BookingRow = {
  id: string;
  event_date: string;
  start_time: string | null;
  expected_guests: number;
  budget: number | null;
  message: string | null;
  status: "pending" | "accepted" | "declined" | "cancelled";
  counterparty: string;
  venueName?: string | null;
};

const statusStyles: Record<BookingRow["status"], string> = {
  pending: "bg-secondary text-secondary-foreground",
  accepted: "bg-stage text-primary-foreground",
  declined: "bg-destructive text-destructive-foreground",
  cancelled: "bg-muted text-muted-foreground",
};

export function BookingList({
  bookings,
  canDecide,
  canCancel,
  emptyText,
}: {
  bookings: BookingRow[];
  canDecide?: boolean;
  canCancel?: boolean;
  emptyText: string;
}) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: BookingRow["status"] }) => {
      const { error } = await supabase.from("bookings").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Booking updated");
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (bookings.length === 0)
    return <p className="text-sm text-muted-foreground">{emptyText}</p>;

  return (
    <div className="space-y-3">
      {bookings.map((b) => (
        <article key={b.id} className="rounded-lg p-4 card-surface">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xl">{b.counterparty}</h3>
            <Badge className={statusStyles[b.status] + " capitalize"}>{b.status}</Badge>
          </div>
          <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <CalendarDays className="size-4" /> {b.event_date}
              {b.start_time ? ` · ${b.start_time.slice(0, 5)}` : ""}
            </span>
            <span className="flex items-center gap-1">
              <Users className="size-4" /> {b.expected_guests} guests
            </span>
            {b.venueName ? <span>@ {b.venueName}</span> : null}
            {b.budget ? <span className="text-primary">${b.budget}</span> : null}
          </div>
          {b.message ? <p className="mt-2 text-sm text-muted-foreground">“{b.message}”</p> : null}
          {b.status === "pending" && (canDecide || canCancel) && (
            <div className="mt-3 flex gap-2">
              {canDecide && (
                <>
                  <Button
                    size="sm"
                    className="bg-stage text-primary-foreground hover:opacity-90"
                    onClick={() => mutation.mutate({ id: b.id, status: "accepted" })}
                  >
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => mutation.mutate({ id: b.id, status: "declined" })}
                  >
                    Decline
                  </Button>
                </>
              )}
              {canCancel && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => mutation.mutate({ id: b.id, status: "cancelled" })}
                >
                  Cancel request
                </Button>
              )}
            </div>
          )}
        </article>
      ))}
    </div>
  );
}