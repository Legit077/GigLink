import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarCheck, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { formatNpr } from "@/lib/format";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GigLink — Book live bands across Nepal" },
      {
        name: "description",
        content:
          "GigLink connects venues and organizers in Kathmandu, Pokhara, Chitwan, Biratnagar and other major Nepali cities with bands and solo artists, with real-time availability and automatic booking conflict detection.",
      },
      { property: "og:title", content: "GigLink — Book live bands across Nepal" },
      {
        property: "og:description",
        content:
          "Find musicians, check live availability and confirm gigs without double bookings.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const { data: artists = [] } = useQuery({
    queryKey: ["featured-artists"],
    queryFn: async () => {
      const { data } = await supabase
        .from("artists")
        .select("id, name, artist_type, genres, hourly_rate, location")
        .eq("is_published", true)
        .eq("is_suspended", false)
        .limit(3);
      return data ?? [];
    },
  });

  return (
    <div>
      <section className="border-b border-border bg-surface-2/40">
        <div className="mx-auto max-w-5xl px-4 py-20 text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-primary">Live music across Nepal</p>
          <h1 className="mt-4 font-display text-5xl font-semibold leading-tight">
            Live music, booked without the double bookings
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-muted-foreground">
            GigLink connects restaurants, bars and event organizers across Nepal with bands and solo
            artists — with real availability, venue capacity checks and conflict detection built in.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/artists">Find an artist</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/gigs">Browse open gigs</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-16">
        <div className="grid gap-4 sm:grid-cols-3">
          <Feature
            icon={<CalendarCheck className="size-5 text-primary" />}
            title="Conflict detection"
            body="Every request is checked against the artist's confirmed schedule before it is sent — and enforced again in the database."
          />
          <Feature
            icon={<Users className="size-5 text-primary" />}
            title="Capacity validation"
            body="Expected guests are compared against the venue's verified capacity so you know before the night arrives."
          />
          <Feature
            icon={<ShieldCheck className="size-5 text-primary" />}
            title="Clear roles"
            body="Artists manage availability, organizers manage gigs, and every action is permission-checked server-side."
          />
        </div>
      </section>

      {artists.length > 0 && (
        <section className="mx-auto max-w-5xl px-4 pb-20">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl font-semibold">Featured artists</h2>
            <Link to="/artists" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {artists.map((a) => (
              <Link
                key={a.id}
                to="/artists/$artistId"
                params={{ artistId: a.id }}
                className="surface-card p-5 transition-colors hover:border-primary/50"
              >
                <p className="font-display text-lg font-semibold">{a.name}</p>
                <p className="mt-1 text-sm capitalize text-muted-foreground">
                  {a.artist_type} · {a.genres.slice(0, 2).join(", ")}
                </p>
                <p className="mt-4 text-sm text-primary">{formatNpr(a.hourly_rate)}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="surface-card p-6">
      <div className="flex size-10 items-center justify-center rounded-md border border-primary/30 bg-primary/10">
        {icon}
      </div>
      <h3 className="mt-4 font-display text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
