import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { GigCard } from "@/components/gig-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { applicationStatusStyles, type ApplicationStatus, type GigRow } from "@/lib/gigs";

type ApplicationWithGig = {
  id: string;
  status: ApplicationStatus;
  proposed_fee: number | null;
  message: string | null;
  gig: GigRow;
};

export function ArtistApplications({ artistId }: { artistId: string }) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["my-applications", "detailed", artistId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gig_applications")
        .select("id, status, proposed_fee, message, gigs (*, venues (name))")
        .eq("artist_id", artistId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? [])
        .filter((row) => row.gigs)
        .map((row) => {
          const gig = row.gigs as GigRow & { venues: { name: string } | null };
          return {
            id: row.id,
            status: row.status as ApplicationStatus,
            proposed_fee: row.proposed_fee,
            message: row.message,
            gig: { ...gig, venueName: gig.venues?.name ?? null },
          } satisfies ApplicationWithGig;
        });
    },
  });

  const withdraw = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("gig_applications").update({ status: "withdrawn" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Application withdrawn");
      queryClient.invalidateQueries({ queryKey: ["my-applications"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <p className="text-muted-foreground">Loading applications…</p>;
  if (!data?.length)
    return <p className="text-sm text-muted-foreground">You haven't applied to any gigs yet. Browse the gig board to get started.</p>;

  return (
    <div className="space-y-4">
      {data.map((app) => (
        <GigCard
          key={app.id}
          gig={app.gig}
          action={
            <>
              <Badge className={applicationStatusStyles[app.status] + " capitalize"}>{app.status}</Badge>
              {app.proposed_fee ? (
                <span className="text-sm text-muted-foreground">Your offer: ${app.proposed_fee}</span>
              ) : null}
              {app.status === "pending" ? (
                <Button size="sm" variant="outline" onClick={() => withdraw.mutate(app.id)}>
                  Withdraw
                </Button>
              ) : null}
            </>
          }
        />
      ))}
    </div>
  );
}