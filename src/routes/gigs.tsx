import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/StatusBadge";
import { CityFilter } from "@/components/CityFilter";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatNpr, formatRange } from "@/lib/format";
import { ALL_CITIES } from "@/lib/cities";

export const Route = createFileRoute("/gigs")({
  head: () => ({
    meta: [
      { title: "Open gigs — GigLink" },
      {
        name: "description",
        content:
          "Browse open gig listings from venues and organizers across Nepal, and apply as a band or solo artist.",
      },
      { property: "og:title", content: "Open gigs — GigLink" },
      {
        property: "og:description",
        content: "Live music opportunities posted by organizers across Nepal.",
      },
    ],
  }),
  component: GigsPage,
});

function GigsPage() {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();
  const [applyGig, setApplyGig] = useState<{ id: string; title: string } | null>(null);
  const [message, setMessage] = useState("");
  const [quote, setQuote] = useState("");
  const [busy, setBusy] = useState(false);
  const [city, setCity] = useState<string>(ALL_CITIES);

  const { data: gigs = [], isLoading } = useQuery({
    queryKey: ["gigs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gigs")
        .select("*, venues(name, max_capacity, city)")
        .gte("event_end", new Date().toISOString())
        .order("event_start");
      if (error) throw error;
      return data;
    },
  });

  const { data: myArtist } = useQuery({
    queryKey: ["my-artist", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("artists")
        .select("id, name")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  async function submitApplication() {
    if (!myArtist || !applyGig) return;
    setBusy(true);
    const { error } = await supabase.from("gig_applications").insert({
      gig_id: applyGig.id,
      artist_id: myArtist.id,
      message: message.trim() || null,
      quoted_price: quote === "" ? null : Number(quote),
    });
    setBusy(false);
    if (error) {
      toast.error(
        error.code === "23505"
          ? "You have already applied to this gig."
          : error.code === "42501"
            ? "This gig is no longer open for applications."
            : error.message,
      );
      void queryClient.invalidateQueries({ queryKey: ["gigs"] });
      return;
    }
    toast.success("Application sent.");
    setApplyGig(null);
    setMessage("");
    setQuote("");
    void queryClient.invalidateQueries({ queryKey: ["gigs"] });
  }

  const cities = useMemo(
    () => Array.from(new Set(gigs.map((g) => g.venues?.city).filter(Boolean) as string[])).sort(),
    [gigs],
  );

  const visibleGigs = useMemo(
    () => (city === ALL_CITIES ? gigs : gigs.filter((g) => g.venues?.city === city)),
    [gigs, city],
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="font-display text-3xl font-semibold">Open gigs</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Opportunities posted by venues and organizers across Nepal.
      </p>

      <div className="surface-card mt-6 p-4">
        <CityFilter cities={cities} value={city} onChange={setCity} />
      </div>

      <p className="mt-4 text-sm text-muted-foreground">
        {isLoading
          ? "Loading gigs…"
          : `${visibleGigs.length} ${visibleGigs.length === 1 ? "gig" : "gigs"}${
              city === ALL_CITIES ? " across Nepal" : ` in ${city}`
            }`}
      </p>

      {isLoading ? (
        <div className="mt-6 space-y-4">
          {[0, 1].map((i) => (
            <div key={i} className="surface-card h-36 animate-pulse p-5" />
          ))}
        </div>
      ) : visibleGigs.length === 0 ? (
        <div className="surface-card mt-6 p-8 text-center">
          <p className="font-medium">No open gigs here yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Try another city — new opportunities are posted regularly.
          </p>
          <Button variant="outline" className="mt-4" onClick={() => setCity(ALL_CITIES)}>
            Show all cities
          </Button>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {visibleGigs.map((g) => (
            <article key={g.id} className="surface-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-semibold">{g.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatRange(g.event_start, g.event_end)}
                    {g.venues?.name ? ` · ${g.venues.name}` : ""}
                    {g.venues?.city ? ` · ${g.venues.city}` : ""}
                  </p>
                </div>
                <StatusBadge status={g.status} />
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{g.description}</p>
              <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <span className="text-primary">{formatNpr(g.budget)}</span>
                <span>{g.expected_attendance} expected guests</span>
                <span>{g.genres.join(", ")}</span>
              </div>

              {role === "artist" && myArtist && g.status === "open" && (
                <Button
                  className="mt-4"
                  size="sm"
                  onClick={() => setApplyGig({ id: g.id, title: g.title })}
                >
                  Apply as {myArtist.name}
                </Button>
              )}
            </article>
          ))}
        </div>
      )}

      <Dialog open={applyGig !== null} onOpenChange={(o) => !o && setApplyGig(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Apply to {applyGig?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ap-msg">Message to the organizer</Label>
              <Textarea
                id="ap-msg"
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ap-quote">Your quote (NPR)</Label>
              <Input
                id="ap-quote"
                type="number"
                min={0}
                value={quote}
                onChange={(e) => setQuote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApplyGig(null)}>
              Cancel
            </Button>
            <Button onClick={submitApplication} disabled={busy}>
              {busy ? "Sending…" : "Send application"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
