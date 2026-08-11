import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { CalendarCheck, Guitar, Search, Star } from "lucide-react";

import heroImage from "@/assets/hero-stage.jpg";
import { ArtistCard, type ArtistSummary } from "@/components/artist-card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { GENRES } from "@/lib/genres";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GigLink — Book Live Music for Your Venue" },
      {
        name: "description",
        content:
          "Find bands and solo artists by genre, send booking requests, and manage every gig — GigLink connects musicians with restaurants and event organizers.",
      },
      { property: "og:title", content: "GigLink — Book Live Music for Your Venue" },
      {
        property: "og:description",
        content: "Discover artists by genre, send booking requests and manage gigs in one place.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { data: artists } = useQuery({
    queryKey: ["featured-artists"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("artists")
        .select("id, stage_name, kind, genres, city, bio, image_url, hourly_rate, members")
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(6);
      if (error) throw error;
      return data as ArtistSummary[];
    },
  });

  return (
    <div>
      <section className="relative isolate overflow-hidden">
        <img
          src={heroImage}
          alt="Band performing under amber and magenta stage lights"
          width={1920}
          height={1080}
          className="absolute inset-0 -z-10 size-full object-cover"
        />
        <div
          className="absolute inset-0 -z-10"
          style={{ backgroundImage: "var(--gradient-veil)" }}
          aria-hidden
        />
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-28 md:py-40">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary">
            Live music, booked properly
          </p>
          <h1 className="max-w-3xl text-5xl leading-[0.95] md:text-7xl">
            Where <span className="text-gradient">bands</span> meet the rooms that need them
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground">
            GigLink lets bands and solo artists showcase their sound, and lets restaurants and event
            organizers search by genre, check capacity and send a booking request in minutes.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg" className="bg-stage text-primary-foreground hover:opacity-90">
              <Link to="/artists">Browse artists</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/auth">Create an account</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-16">
        <h2 className="text-3xl md:text-4xl">How it works</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            {
              icon: Guitar,
              title: "Artists build a profile",
              text: "Sign up as a band or a solo artist, list your genres and link your Spotify or YouTube showcase.",
            },
            {
              icon: Search,
              title: "Organizers search by genre",
              text: "Restaurants and event organizers filter by genre and city, then set venue capacity and expected guests.",
            },
            {
              icon: CalendarCheck,
              title: "Book, confirm, play",
              text: "Send a booking request with date and budget. The artist accepts or declines — everyone stays in sync.",
            },
          ].map((s) => (
            <div key={s.title} className="rounded-xl p-6 card-surface">
              <s.icon className="size-8 text-primary" />
              <h3 className="mt-4 text-2xl">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-16">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-3xl md:text-4xl">Fresh on the roster</h2>
          <Link to="/artists" className="text-sm text-primary hover:underline">
            See all artists
          </Link>
        </div>
        {artists && artists.length > 0 ? (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {artists.map((a) => (
              <ArtistCard key={a.id} artist={a} />
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-xl p-10 text-center card-surface">
            <Star className="mx-auto size-8 text-primary" />
            <p className="mt-3 text-muted-foreground">
              No artists yet — be the first to put your act on GigLink.
            </p>
            <Button asChild className="mt-4 bg-stage text-primary-foreground hover:opacity-90">
              <Link to="/auth">Join as an artist</Link>
            </Button>
          </div>
        )}
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-24">
        <h2 className="text-3xl md:text-4xl">Browse by genre</h2>
        <div className="mt-6 flex flex-wrap gap-2">
          {GENRES.map((g) => (
            <Link
              key={g}
              to="/artists"
              search={{ genre: g, q: "" }}
              className="rounded-full border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            >
              {g}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}