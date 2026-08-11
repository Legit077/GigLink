import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { GigCard } from "@/components/gig-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { GENRES } from "@/lib/genres";
import { applicationStatusStyles, type ApplicationStatus, type GigRow } from "@/lib/gigs";

type Filters = {
  search: string;
  city: string;
  genre: string;
  from: string;
  to: string;
  minPayment: string;
};

const emptyFilters: Filters = { search: "", city: "", genre: "", from: "", to: "", minPayment: "" };

export function GigBoard({ artistId }: { artistId?: string | null }) {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [openGigId, setOpenGigId] = useState<string | null>(null);
  const [proposal, setProposal] = useState({ message: "", fee: "" });

  const { data: gigs, isLoading } = useQuery({
    queryKey: ["gigs", "open"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gigs")
        .select("*, venues (name)")
        .eq("status", "open")
        .gte("event_date", new Date().toISOString().slice(0, 10))
        .order("event_date", { ascending: true });
      if (error) throw error;
      return data.map((g) => ({
        ...g,
        venueName: (g.venues as { name: string } | null)?.name ?? null,
      })) as GigRow[];
    },
  });

  const { data: applications } = useQuery({
    queryKey: ["my-applications", artistId],
    enabled: !!artistId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gig_applications")
        .select("id, gig_id, status")
        .eq("artist_id", artistId!);
      if (error) throw error;
      return data as { id: string; gig_id: string; status: ApplicationStatus }[];
    },
  });

  const apply = useMutation({
    mutationFn: async (gigId: string) => {
      const { error } = await supabase.from("gig_applications").insert({
        gig_id: gigId,
        artist_id: artistId!,
        message: proposal.message || null,
        proposed_fee: proposal.fee ? Number(proposal.fee) : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Application sent to the organizer");
      setOpenGigId(null);
      setProposal({ message: "", fee: "" });
      queryClient.invalidateQueries({ queryKey: ["my-applications"] });
      queryClient.invalidateQueries({ queryKey: ["gig-applications"] });
    },
    onError: (e: Error) => {
      if (e.message.includes("gig_applications_artist_gig_unique")) {
        toast.error("You have already applied to this gig");
      } else {
        toast.error(e.message);
      }
    },
  });

  const statusByGig = new Map(applications?.map((a) => [a.gig_id, a.status]) ?? []);

  const visible = (gigs ?? []).filter((g) => {
    const q = filters.search.trim().toLowerCase();
    if (q && !`${g.title} ${g.description ?? ""} ${g.venueName ?? ""}`.toLowerCase().includes(q)) return false;
    if (filters.city && !(g.city ?? "").toLowerCase().includes(filters.city.trim().toLowerCase())) return false;
    if (filters.genre && !g.genres.includes(filters.genre)) return false;
    if (filters.from && g.event_date < filters.from) return false;
    if (filters.to && g.event_date > filters.to) return false;
    if (filters.minPayment && (g.payment ?? 0) < Number(filters.minPayment)) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-3 rounded-xl p-4 card-surface sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <Label htmlFor="gig-search">Search</Label>
          <Input
            id="gig-search"
            placeholder="Title, venue or details"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="gig-city">City</Label>
          <Input
            id="gig-city"
            placeholder="Anywhere"
            value={filters.city}
            onChange={(e) => setFilters({ ...filters, city: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="gig-genre">Genre</Label>
          <select
            id="gig-genre"
            value={filters.genre}
            onChange={(e) => setFilters({ ...filters, genre: e.target.value })}
            className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">All genres</option>
            {GENRES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="gig-from">From date</Label>
          <Input
            id="gig-from"
            type="date"
            value={filters.from}
            onChange={(e) => setFilters({ ...filters, from: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="gig-to">To date</Label>
          <Input
            id="gig-to"
            type="date"
            value={filters.to}
            onChange={(e) => setFilters({ ...filters, to: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="gig-pay">Minimum payment ($)</Label>
          <Input
            id="gig-pay"
            type="number"
            min={0}
            value={filters.minPayment}
            onChange={(e) => setFilters({ ...filters, minPayment: e.target.value })}
          />
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <Button variant="outline" size="sm" onClick={() => setFilters(emptyFilters)}>
            Reset filters
          </Button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading gigs…</p>
      ) : visible.length === 0 ? (
        <p className="text-muted-foreground">No gigs match these filters yet. Try widening your search.</p>
      ) : (
        <div className="space-y-4">
          {visible.map((gig) => {
            const status = statusByGig.get(gig.id);
            return (
              <div key={gig.id} className="space-y-3">
                <GigCard
                  gig={gig}
                  action={
                    artistId ? (
                      status ? (
                        <Badge className={applicationStatusStyles[status] + " capitalize"}>
                          Application {status}
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          className="bg-stage text-primary-foreground hover:opacity-90"
                          onClick={() => setOpenGigId(openGigId === gig.id ? null : gig.id)}
                        >
                          {openGigId === gig.id ? "Close" : "Apply / send offer"}
                        </Button>
                      )
                    ) : (
                      <span className="text-sm text-muted-foreground">Sign in as an artist to apply.</span>
                    )
                  }
                />
                {openGigId === gig.id && artistId && !status ? (
                  <form
                    className="space-y-3 rounded-xl p-5 card-surface"
                    onSubmit={(e) => {
                      e.preventDefault();
                      apply.mutate(gig.id);
                    }}
                  >
                    <div>
                      <Label htmlFor={`fee-${gig.id}`}>Your proposed fee ($)</Label>
                      <Input
                        id={`fee-${gig.id}`}
                        type="number"
                        min={0}
                        value={proposal.fee}
                        onChange={(e) => setProposal({ ...proposal, fee: e.target.value })}
                        placeholder={gig.payment ? String(gig.payment) : "Your rate"}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`msg-${gig.id}`}>Message to the organizer</Label>
                      <Textarea
                        id={`msg-${gig.id}`}
                        rows={3}
                        value={proposal.message}
                        onChange={(e) => setProposal({ ...proposal, message: e.target.value })}
                        placeholder="Tell them about your set, past shows and why you fit this night."
                      />
                    </div>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={apply.isPending}
                      className="bg-stage text-primary-foreground hover:opacity-90"
                    >
                      {apply.isPending ? "Sending…" : "Send application"}
                    </Button>
                  </form>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}