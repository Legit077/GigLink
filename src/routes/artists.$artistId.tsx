import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { MapPin, Star, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AvailabilityCalendar } from "@/components/AvailabilityCalendar";
import { BookingRequestDialog } from "@/components/BookingRequestDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatNpr, formatDate } from "@/lib/format";
import { ArtistLinks } from "@/components/ArtistLinks";
import { EmptyState } from "@/components/EmptyState";
import { parseArtistLinks } from "@/lib/links";

export const Route = createFileRoute("/artists/$artistId")({
  head: () => ({
    meta: [
      { title: "Artist profile — GigLink" },
      {
        name: "description",
        content:
          "See an artist's genres, rate, reviews and live availability calendar, then send a booking request.",
      },
      { property: "og:title", content: "Artist profile — GigLink" },
      {
        property: "og:description",
        content: "Availability, rates and reviews for musicians across Nepal.",
      },
    ],
  }),
  component: ArtistProfile,
});

function ArtistProfile() {
  const { artistId } = Route.useParams();
  const { user } = useAuth();
  const [bookingOpen, setBookingOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["artist", artistId],
    queryFn: async () => {
      const [artist, availability, bookings, reviews] = await Promise.all([
        supabase.from("artists").select("*").eq("id", artistId).maybeSingle(),
        supabase.from("artist_availability").select("date, status").eq("artist_id", artistId),
        supabase
          .from("bookings")
          .select("event_start, event_end, status")
          .eq("artist_id", artistId),
        supabase
          .from("reviews")
          .select("id, rating, comment, reviewer_name, created_at")
          .eq("artist_id", artistId)
          .order("created_at", { ascending: false }),
      ]);
      return {
        artist: artist.data,
        availability: (availability.data ?? []) as { date: string; status: "open" | "blocked" }[],
        bookings: bookings.data ?? [],
        reviews: reviews.data ?? [],
      };
    },
  });

  if (isLoading) {
    return <p className="mx-auto max-w-5xl px-4 py-12 text-muted-foreground">Loading artist…</p>;
  }
  if (!data?.artist) {
    return <p className="mx-auto max-w-5xl px-4 py-12 text-muted-foreground">Artist not found.</p>;
  }

  const artist = data.artist;
  const avgRating =
    data.reviews.length > 0
      ? data.reviews.reduce((sum, r) => sum + r.rating, 0) / data.reviews.length
      : null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="surface-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-3xl font-semibold break-words">{artist.name}</h1>
            <p className="mt-1 text-sm capitalize text-muted-foreground">
              {artist.artist_type} · {artist.genres.join(", ")}
            </p>
            <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-4" /> {artist.location}
              </span>
              {artist.members_count && (
                <span className="inline-flex items-center gap-1.5">
                  <Users className="size-4" /> {artist.members_count} members
                </span>
              )}
              {avgRating !== null && (
                <span className="inline-flex items-center gap-1.5 text-warning">
                  <Star className="size-4" /> {avgRating.toFixed(1)} ({data.reviews.length})
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="font-display text-xl text-primary">{formatNpr(artist.hourly_rate)}</p>
            <Button className="mt-3" onClick={() => setBookingOpen(true)}>
              {user ? "Request booking" : "Sign in to book"}
            </Button>
          </div>
        </div>
        {artist.bio && <p className="mt-5 text-sm text-muted-foreground">{artist.bio}</p>}
        {parseArtistLinks(artist.links).length > 0 && (
          <div className="mt-5 border-t border-border pt-5">
            <p className="text-sm font-medium">Listen &amp; watch</p>
            <div className="mt-3">
              <ArtistLinks links={parseArtistLinks(artist.links)} />
            </div>
          </div>
        )}
      </div>

      <section className="mt-8">
        <h2 className="font-display text-xl font-semibold">Availability</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Dates blocked by the artist and dates already held by confirmed bookings.
        </p>
        <div className="mt-4 scroll-x">
          <AvailabilityCalendar availability={data.availability} bookings={data.bookings} />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-xl font-semibold">Reviews</h2>
        {data.reviews.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              icon={Star}
              title="No reviews yet"
              description="Reviews appear here after organizers complete a booking with this artist."
            />
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {data.reviews.map((r) => (
              <div key={r.id} className="surface-card p-4">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{r.reviewer_name}</p>
                  <p className="inline-flex items-center gap-1 text-sm text-warning">
                    <Star className="size-3.5" /> {r.rating}/5
                  </p>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{r.comment}</p>
                <p className="mt-2 text-xs text-muted-foreground">{formatDate(r.created_at)}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <BookingRequestDialog
        artistId={artist.id}
        artistName={artist.name}
        open={bookingOpen}
        onOpenChange={setBookingOpen}
      />
    </div>
  );
}
