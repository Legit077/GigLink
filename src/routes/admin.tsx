import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatNpr, formatRange } from "@/lib/format";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin console — GigLink" },
      {
        name: "description",
        content:
          "Platform overview of artists, venues, gigs and bookings across the GigLink network in Nepal.",
      },
      { property: "og:title", content: "Admin console — GigLink" },
      {
        property: "og:description",
        content: "Monitor GigLink activity across artists, venues and bookings.",
      },
    ],
  }),
  component: AdminConsole,
});

function AdminConsole() {
  const { user, role, loading } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-overview"],
    enabled: role === "admin",
    queryFn: async () => {
      const [artists, venues, gigs, bookings, artistRows, reviews] = await Promise.all([
        supabase.from("artists").select("id", { count: "exact", head: true }),
        supabase.from("venues").select("id", { count: "exact", head: true }),
        supabase.from("gigs").select("id", { count: "exact", head: true }),
        supabase
          .from("bookings")
          .select("*, artists(name), venues(name)")
          .order("event_start", { ascending: false })
          .limit(50),
        supabase.from("artists").select("id, name, city, is_suspended").order("name"),
        supabase
          .from("reviews")
          .select("id, rating, comment, reviewer_name, artists(name)")
          .order("created_at", { ascending: false })
          .limit(20),
      ]);
      return {
        artistCount: artists.count ?? 0,
        venueCount: venues.count ?? 0,
        gigCount: gigs.count ?? 0,
        bookings: bookings.data ?? [],
        artistRows: artistRows.data ?? [],
        reviews: reviews.data ?? [],
      };
    },
  });

  async function setSuspended(artistId: string, suspended: boolean) {
    const { error } = await supabase
      .from("artists")
      .update({ is_suspended: suspended })
      .eq("id", artistId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(suspended ? "Artist suspended." : "Artist reinstated.");
    void queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
  }

  async function removeReview(reviewId: string) {
    if (!window.confirm("Delete this review permanently?")) return;
    const { error } = await supabase.from("reviews").delete().eq("id", reviewId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Review deleted.");
    void queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
  }

  if (loading) {
    return <p className="mx-auto max-w-5xl px-4 py-12 text-muted-foreground">Loading…</p>;
  }
  if (!user || role !== "admin") {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12">
        <h1 className="font-display text-2xl font-semibold">Admins only</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This console is restricted to GigLink administrators.
        </p>
        <Button asChild className="mt-4">
          <Link to="/">Back home</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="font-display text-3xl font-semibold">Admin console</h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Artists" value={data?.artistCount} />
        <Stat label="Venues" value={data?.venueCount} />
        <Stat label="Gigs" value={data?.gigCount} />
      </div>

      <section className="mt-8">
        <h2 className="font-display text-xl font-semibold">Artists</h2>
        <div className="mt-4 space-y-2">
          {data?.artistRows.map((a) => (
            <div
              key={a.id}
              className="surface-card flex flex-wrap items-center justify-between gap-3 p-3"
            >
              <p className="min-w-0 flex-1 text-sm">
                <span className="font-medium">{a.name}</span>
                <span className="text-muted-foreground"> · {a.city}</span>
                {a.is_suspended && <span className="ml-2 text-danger">Suspended</span>}
              </p>
              <Button
                size="sm"
                variant={a.is_suspended ? "default" : "outline"}
                onClick={() => setSuspended(a.id, !a.is_suspended)}
              >
                {a.is_suspended ? "Reinstate" : "Suspend"}
              </Button>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-xl font-semibold">Recent reviews</h2>
        <div className="mt-4 space-y-2">
          {data?.reviews.map((r) => (
            <div
              key={r.id}
              className="surface-card flex flex-wrap items-center justify-between gap-3 p-3"
            >
              <p className="min-w-0 flex-1 text-sm break-words">
                <span className="font-medium">{r.artists?.name}</span> · {r.rating}/5 ·{" "}
                {r.reviewer_name}
                {r.comment ? ` — ${r.comment}` : ""}
              </p>
              <Button size="sm" variant="outline" onClick={() => removeReview(r.id)}>
                Delete
              </Button>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-xl font-semibold">Recent bookings</h2>
        {isLoading ? (
          <p className="mt-2 text-sm text-muted-foreground">Loading bookings…</p>
        ) : (
          <div className="mt-4 space-y-3">
            {data?.bookings.map((b) => (
              <div
                key={b.id}
                className="surface-card flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium break-words">
                    {b.artists?.name} — {b.title}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatRange(b.event_start, b.event_end)}
                    {b.venues?.name ? ` · ${b.venues.name}` : ""} · {formatNpr(b.agreed_price)}
                  </p>
                </div>
                <StatusBadge status={b.status} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | undefined }) {
  return (
    <div className="surface-card p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-3xl font-semibold text-primary">{value ?? "—"}</p>
    </div>
  );
}
