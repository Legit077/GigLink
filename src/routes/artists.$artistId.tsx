import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ExternalLink, MapPin, Star, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import artistPlaceholder from "@/assets/artist-placeholder.jpg";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useRoles } from "@/lib/auth";

export const Route = createFileRoute("/artists/$artistId")({
  head: () => ({
    meta: [
      { title: "Artist Profile | GigLink" },
      {
        name: "description",
        content:
          "See genres, music links, reviews and rates for this GigLink artist, and send them a booking request.",
      },
      { property: "og:title", content: "Artist Profile | GigLink" },
      {
        property: "og:description",
        content: "Genres, music links, reviews and booking for this GigLink artist.",
      },
    ],
  }),
  component: ArtistDetail,
  errorComponent: ({ error }) => (
    <p role="alert" className="mx-auto max-w-4xl px-4 py-20 text-destructive">
      {error.message}
    </p>
  ),
  notFoundComponent: () => (
    <p className="mx-auto max-w-4xl px-4 py-20 text-muted-foreground">Artist not found.</p>
  ),
});

function ArtistDetail() {
  const { artistId } = Route.useParams();
  const { session } = useAuth();
  const { isOrganizer } = useRoles();
  const queryClient = useQueryClient();

  const { data: artist, isLoading } = useQuery({
    queryKey: ["artist", artistId],
    queryFn: async () => {
      const { data, error } = await supabase.from("artists").select("*").eq("id", artistId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: reviews } = useQuery({
    queryKey: ["reviews", artistId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("id, rating, comment, created_at, reviewer_id")
        .eq("artist_id", artistId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const ids = [...new Set(data.map((r) => r.reviewer_id))];
      const names = new Map<string, string>();
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", ids);
        profs?.forEach((p) => names.set(p.id, p.full_name));
      }
      return data.map((r) => ({ ...r, reviewerName: names.get(r.reviewer_id) || "GigLink user" }));
    },
  });

  const { data: venues } = useQuery({
    queryKey: ["my-venues", session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("venues")
        .select("id, name, capacity, expected_guests")
        .eq("owner_id", session!.user.id);
      if (error) throw error;
      return data;
    },
  });

  const avg =
    reviews && reviews.length > 0
      ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
      : null;

  if (isLoading) return <p className="mx-auto max-w-4xl px-4 py-20 text-muted-foreground">Loading…</p>;
  if (!artist)
    return <p className="mx-auto max-w-4xl px-4 py-20 text-muted-foreground">Artist not found.</p>;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12">
      <div className="grid gap-8 md:grid-cols-[1.2fr_1fr]">
        <div>
          <div className="overflow-hidden rounded-xl card-surface">
            <img
              src={artist.image_url || artistPlaceholder}
              alt={`${artist.stage_name} on stage`}
              className="aspect-video w-full object-cover"
            />
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <h1 className="text-4xl md:text-5xl">{artist.stage_name}</h1>
            <Badge className="bg-stage text-primary-foreground capitalize">{artist.kind}</Badge>
            {avg !== null && (
              <span className="flex items-center gap-1 text-primary">
                <Star className="size-4 fill-current" /> {avg.toFixed(1)} ({reviews?.length})
              </span>
            )}
          </div>

          <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="size-4" /> {artist.city || "Anywhere"}
            </span>
            <span className="flex items-center gap-1">
              <Users className="size-4" /> {artist.members} member(s)
            </span>
            {artist.hourly_rate ? (
              <span className="font-semibold text-primary">${artist.hourly_rate}/hr</span>
            ) : null}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {artist.genres.map((g: string) => (
              <Badge key={g} variant="secondary">
                {g}
              </Badge>
            ))}
          </div>

          <p className="mt-6 whitespace-pre-line text-muted-foreground">
            {artist.bio || "This artist hasn't written a bio yet."}
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            {[
              { url: artist.spotify_url, label: "Spotify" },
              { url: artist.youtube_url, label: "YouTube" },
              { url: artist.instagram_url, label: "Instagram" },
            ]
              .filter((l) => !!l.url)
              .map((l) => (
                <a
                  key={l.label}
                  href={l.url as string}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-2 text-sm hover:border-primary hover:text-primary"
                >
                  {l.label} <ExternalLink className="size-3.5" />
                </a>
              ))}
          </div>

          <section className="mt-12">
            <h2 className="text-3xl">Reviews</h2>
            <ReviewForm artistId={artistId} />
            <div className="mt-6 space-y-4">
              {reviews && reviews.length > 0 ? (
                reviews.map((r) => (
                  <article key={r.id} className="rounded-lg p-4 card-surface">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 text-primary">
                        <Star className="size-4 fill-current" /> {r.rating}
                      </span>
                      <span className="text-sm text-muted-foreground">{r.reviewerName}</span>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{r.comment}</p>
                  </article>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No reviews yet.</p>
              )}
            </div>
          </section>
        </div>

        <aside className="h-fit rounded-xl p-6 card-surface md:sticky md:top-24">
          <h2 className="text-2xl">Send a booking request</h2>
          {!session ? (
            <>
              <p className="mt-2 text-sm text-muted-foreground">
                Sign in as an event organizer or restaurant to book this artist.
              </p>
              <Button asChild className="mt-4 w-full bg-stage text-primary-foreground hover:opacity-90">
                <Link to="/auth">Sign in to book</Link>
              </Button>
            </>
          ) : !isOrganizer ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Only event organizer / restaurant accounts can send booking requests.
            </p>
          ) : (
            <BookingForm
              artistId={artistId}
              organizerId={session.user.id}
              venues={venues ?? []}
              onDone={() => queryClient.invalidateQueries({ queryKey: ["bookings"] })}
            />
          )}
        </aside>
      </div>
    </div>
  );
}

function BookingForm({
  artistId,
  organizerId,
  venues,
  onDone,
}: {
  artistId: string;
  organizerId: string;
  venues: { id: string; name: string; capacity: number; expected_guests: number }[];
  onDone: () => void;
}) {
  const [venueId, setVenueId] = useState<string>("");
  const [eventDate, setEventDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [guests, setGuests] = useState("");
  const [budget, setBudget] = useState("");
  const [message, setMessage] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("bookings").insert({
        artist_id: artistId,
        organizer_id: organizerId,
        venue_id: venueId || null,
        event_date: eventDate,
        start_time: startTime || null,
        expected_guests: Number(guests) || 0,
        budget: budget ? Number(budget) : null,
        message,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Booking request sent");
      setEventDate("");
      setStartTime("");
      setGuests("");
      setBudget("");
      setMessage("");
      onDone();
    },
    onError: (e: Error) => {
      if (e.message.includes("idx_bookings_artist_date_confirmed")) {
        toast.error("This artist already has a booking on that date");
      } else {
        toast.error(e.message);
      }
    },
  });

  return (
    <form
      className="mt-4 space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!eventDate) return toast.error("Pick an event date");
        mutation.mutate();
      }}
    >
      {venues.length > 0 && (
        <div>
          <Label>Venue</Label>
          <Select value={venueId} onValueChange={setVenueId}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select a venue" />
            </SelectTrigger>
            <SelectContent>
              {venues.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.name} · cap {v.capacity}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="date">Date</Label>
          <Input id="date" type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="time">Start time</Label>
          <Input id="time" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="guests">Expected guests</Label>
          <Input id="guests" type="number" min={0} value={guests} onChange={(e) => setGuests(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="budget">Budget ($)</Label>
          <Input id="budget" type="number" min={0} value={budget} onChange={(e) => setBudget(e.target.value)} />
        </div>
      </div>
      <div>
        <Label htmlFor="msg">Message</Label>
        <Textarea
          id="msg"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Tell the artist about the event…"
        />
      </div>
      <Button
        type="submit"
        disabled={mutation.isPending}
        className="w-full bg-stage text-primary-foreground hover:opacity-90"
      >
        {mutation.isPending ? "Sending…" : "Send request"}
      </Button>
    </form>
  );
}

function ReviewForm({ artistId }: { artistId: string }) {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("reviews")
        .upsert(
          { artist_id: artistId, reviewer_id: session!.user.id, rating, comment },
          { onConflict: "artist_id,reviewer_id" },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Review saved");
      setComment("");
      queryClient.invalidateQueries({ queryKey: ["reviews", artistId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!session)
    return (
      <p className="mt-3 text-sm text-muted-foreground">
        <Link to="/auth" className="text-primary hover:underline">
          Sign in
        </Link>{" "}
        to rate and review this artist.
      </p>
    );

  return (
    <form
      className="mt-4 space-y-3 rounded-lg p-4 card-surface"
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
    >
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} stars`}>
            <Star
              className={"size-6 " + (n <= rating ? "fill-current text-primary" : "text-muted-foreground")}
            />
          </button>
        ))}
      </div>
      <Textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="How was the performance?"
      />
      <Button type="submit" disabled={mutation.isPending} variant="secondary">
        {mutation.isPending ? "Saving…" : "Post review"}
      </Button>
    </form>
  );
}