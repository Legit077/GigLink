import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { BookingList, type BookingRow } from "@/components/booking-list";
import { ArtistApplications } from "@/components/artist-applications";
import { GigBoard } from "@/components/gig-board";
import { OrganizerGigs } from "@/components/organizer-gigs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useProfile, useRoles } from "@/lib/auth";
import { GENRES } from "@/lib/genres";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Your GigLink Dashboard" },
      { name: "description", content: "Manage your artist profile, venues and booking requests on GigLink." },
      { property: "og:title", content: "Your GigLink Dashboard" },
      { property: "og:description", content: "Manage your profile, venues and bookings." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { session } = useAuth();
  const { isArtist, isOrganizer, loading } = useRoles();
  const { data: profile } = useProfile();

  if (!session) return null;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12">
      <h1 className="text-4xl md:text-5xl">
        Hey {profile?.full_name?.split(" ")[0] || "there"}
      </h1>
      <p className="mt-2 text-muted-foreground">
        {isOrganizer ? "Manage your venues and booking requests." : "Manage your artist page and gigs."}
      </p>

      {loading ? (
        <p className="mt-10 text-muted-foreground">Loading…</p>
      ) : isOrganizer ? (
        <OrganizerPanel userId={session.user.id} />
      ) : isArtist ? (
        <ArtistPanel userId={session.user.id} />
      ) : (
        <p className="mt-10 text-muted-foreground">No role assigned to this account yet.</p>
      )}
    </div>
  );
}

/* ---------------- Artist ---------------- */

function ArtistPanel({ userId }: { userId: string }) {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  const { data: artist, isLoading } = useQuery({
    queryKey: ["my-artist", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("artists").select("*").eq("user_id", userId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const createArtist = useMutation({
    mutationFn: async () => {
      const meta = session?.user.user_metadata ?? {};
      const { error } = await supabase.from("artists").insert({
        user_id: userId,
        stage_name: (meta.full_name as string) || "New artist",
        kind: meta.artist_kind === "band" ? "band" : "solo",
        members: meta.artist_kind === "band" ? 3 : 1,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-artist", userId] }),
  });

  useEffect(() => {
    if (!isLoading && !artist && !createArtist.isPending && !createArtist.isSuccess) {
      createArtist.mutate();
    }
  }, [isLoading, artist, createArtist]);

  const { data: bookings } = useQuery({
    queryKey: ["bookings", "artist", artist?.id],
    enabled: !!artist,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*, venues (name)")
        .eq("artist_id", artist!.id)
        .order("event_date", { ascending: true });
      if (error) throw error;
      const ids = [...new Set(data.map((b) => b.organizer_id))];
      const names = new Map<string, string>();
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", ids);
        profs?.forEach((p) => names.set(p.id, p.full_name));
      }
      return data.map((b) => ({
        ...b,
        counterparty: names.get(b.organizer_id) || "Event organizer",
        venueName: (b.venues as { name: string } | null)?.name ?? null,
      })) as BookingRow[];
    },
  });

  if (isLoading || !artist) return <p className="mt-10 text-muted-foreground">Setting up your artist page…</p>;

  return (
    <Tabs defaultValue="profile" className="mt-8">
      <TabsList className="flex-wrap">
        <TabsTrigger value="profile">Artist profile</TabsTrigger>
        <TabsTrigger value="gigs">Find gigs</TabsTrigger>
        <TabsTrigger value="applications">My applications</TabsTrigger>
        <TabsTrigger value="requests">Booking requests</TabsTrigger>
      </TabsList>
      <TabsContent value="profile" className="mt-6">
        <ArtistForm artist={artist} />
      </TabsContent>
      <TabsContent value="gigs" className="mt-6">
        <GigBoard artistId={artist.id} />
      </TabsContent>
      <TabsContent value="applications" className="mt-6">
        <ArtistApplications artistId={artist.id} />
      </TabsContent>
      <TabsContent value="requests" className="mt-6">
        <BookingList
          bookings={bookings ?? []}
          canDecide
          emptyText="No booking requests yet. Keep your profile fresh so organizers can find you."
        />
      </TabsContent>
    </Tabs>
  );
}

type ArtistRow = {
  id: string;
  stage_name: string;
  kind: "band" | "solo";
  genres: string[];
  bio: string | null;
  city: string | null;
  hourly_rate: number | null;
  members: number;
  spotify_url: string | null;
  youtube_url: string | null;
  instagram_url: string | null;
  image_url: string | null;
  is_published: boolean;
};

function ArtistForm({ artist }: { artist: ArtistRow }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(artist);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("artists")
        .update({
          stage_name: form.stage_name,
          kind: form.kind,
          genres: form.genres,
          bio: form.bio,
          city: form.city,
          hourly_rate: form.hourly_rate,
          members: form.members,
          spotify_url: form.spotify_url,
          youtube_url: form.youtube_url,
          instagram_url: form.instagram_url,
          image_url: form.image_url,
          is_published: form.is_published,
        })
        .eq("id", artist.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profile saved");
      queryClient.invalidateQueries({ queryKey: ["my-artist"] });
      queryClient.invalidateQueries({ queryKey: ["artists"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function toggleGenre(g: string) {
    setForm((f) => ({
      ...f,
      genres: f.genres.includes(g) ? f.genres.filter((x) => x !== g) : [...f.genres, g],
    }));
  }

  return (
    <form
      className="space-y-5 rounded-xl p-6 card-surface"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="stage">Stage name</Label>
          <Input
            id="stage"
            value={form.stage_name}
            onChange={(e) => setForm({ ...form, stage_name: e.target.value })}
          />
        </div>
        <div>
          <Label>Act type</Label>
          <div className="mt-1 flex gap-2">
            {(["band", "solo"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setForm({ ...form, kind: k })}
                className={
                  "flex-1 rounded-md border px-3 py-2 text-sm capitalize " +
                  (form.kind === k
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground")
                }
              >
                {k}
              </button>
            ))}
          </div>
        </div>
        <div>
          <Label htmlFor="city">City</Label>
          <Input id="city" value={form.city ?? ""} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="members">Members</Label>
          <Input
            id="members"
            type="number"
            min={1}
            value={form.members}
            onChange={(e) => setForm({ ...form, members: Number(e.target.value) })}
          />
        </div>
        <div>
          <Label htmlFor="rate">Rate per hour ($)</Label>
          <Input
            id="rate"
            type="number"
            min={0}
            value={form.hourly_rate ?? ""}
            onChange={(e) =>
              setForm({ ...form, hourly_rate: e.target.value ? Number(e.target.value) : null })
            }
          />
        </div>
        <div>
          <Label htmlFor="image">Photo URL</Label>
          <Input
            id="image"
            value={form.image_url ?? ""}
            onChange={(e) => setForm({ ...form, image_url: e.target.value })}
          />
        </div>
      </div>

      <div>
        <Label>Genres</Label>
        <div className="mt-2 flex flex-wrap gap-2">
          {GENRES.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => toggleGenre(g)}
              className={
                "rounded-full border px-3 py-1 text-sm " +
                (form.genres.includes(g)
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground")
              }
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label htmlFor="bio">Bio</Label>
        <Textarea id="bio" rows={4} value={form.bio ?? ""} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="spotify">Spotify link</Label>
          <Input
            id="spotify"
            value={form.spotify_url ?? ""}
            onChange={(e) => setForm({ ...form, spotify_url: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="youtube">YouTube link</Label>
          <Input
            id="youtube"
            value={form.youtube_url ?? ""}
            onChange={(e) => setForm({ ...form, youtube_url: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="insta">Instagram link</Label>
          <Input
            id="insta"
            value={form.instagram_url ?? ""}
            onChange={(e) => setForm({ ...form, instagram_url: e.target.value })}
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Switch
          id="published"
          checked={form.is_published}
          onCheckedChange={(v) => setForm({ ...form, is_published: v })}
        />
        <Label htmlFor="published">Visible in search results</Label>
      </div>

      <Button type="submit" disabled={save.isPending} className="bg-stage text-primary-foreground hover:opacity-90">
        {save.isPending ? "Saving…" : "Save profile"}
      </Button>
    </form>
  );
}

/* ---------------- Organizer ---------------- */

function OrganizerPanel({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const [venue, setVenue] = useState({
    name: "",
    city: "",
    address: "",
    capacity: "",
    expected_guests: "",
    description: "",
    image_url: "",
  });

  const { data: venues } = useQuery({
    queryKey: ["my-venues", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("venues").select("*").eq("owner_id", userId);
      if (error) throw error;
      return data;
    },
  });

  const { data: bookings } = useQuery({
    queryKey: ["bookings", "organizer", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*, venues (name), artists (stage_name)")
        .eq("organizer_id", userId)
        .order("event_date", { ascending: true });
      if (error) throw error;
      return data.map((b) => ({
        ...b,
        counterparty: (b.artists as { stage_name: string } | null)?.stage_name || "Artist",
        venueName: (b.venues as { name: string } | null)?.name ?? null,
      })) as BookingRow[];
    },
  });

  const addVenue = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("venues").insert({
        owner_id: userId,
        name: venue.name,
        city: venue.city,
        address: venue.address,
        capacity: Number(venue.capacity) || 0,
        expected_guests: Number(venue.expected_guests) || 0,
        description: venue.description,
        image_url: venue.image_url || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Venue added");
      setVenue({ name: "", city: "", address: "", capacity: "", expected_guests: "", description: "", image_url: "" });
      queryClient.invalidateQueries({ queryKey: ["my-venues", userId] });
      queryClient.invalidateQueries({ queryKey: ["venues"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeVenue = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("venues").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Venue removed");
      queryClient.invalidateQueries({ queryKey: ["my-venues", userId] });
      queryClient.invalidateQueries({ queryKey: ["venues"] });
    },
  });

  return (
    <Tabs defaultValue="venues" className="mt-8">
      <TabsList className="flex-wrap">
        <TabsTrigger value="venues">My venues</TabsTrigger>
        <TabsTrigger value="gigs">My gigs</TabsTrigger>
        <TabsTrigger value="bookings">My bookings</TabsTrigger>
      </TabsList>

      <TabsContent value="venues" className="mt-6 space-y-6">
        <form
          className="space-y-4 rounded-xl p-6 card-surface"
          onSubmit={(e) => {
            e.preventDefault();
            if (!venue.name) return toast.error("Give the venue a name");
            addVenue.mutate();
          }}
        >
          <h2 className="text-2xl">Add a venue</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="vname">Name</Label>
              <Input id="vname" value={venue.name} onChange={(e) => setVenue({ ...venue, name: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="vcity">City</Label>
              <Input id="vcity" value={venue.city} onChange={(e) => setVenue({ ...venue, city: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="vaddr">Address</Label>
              <Input id="vaddr" value={venue.address} onChange={(e) => setVenue({ ...venue, address: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="vimg">Photo URL</Label>
              <Input id="vimg" value={venue.image_url} onChange={(e) => setVenue({ ...venue, image_url: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="vcap">Capacity</Label>
              <Input
                id="vcap"
                type="number"
                min={0}
                value={venue.capacity}
                onChange={(e) => setVenue({ ...venue, capacity: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="vguests">Expected guests</Label>
              <Input
                id="vguests"
                type="number"
                min={0}
                value={venue.expected_guests}
                onChange={(e) => setVenue({ ...venue, expected_guests: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="vdesc">Description</Label>
            <Textarea
              id="vdesc"
              value={venue.description}
              onChange={(e) => setVenue({ ...venue, description: e.target.value })}
            />
          </div>
          <Button type="submit" disabled={addVenue.isPending} className="bg-stage text-primary-foreground hover:opacity-90">
            Add venue
          </Button>
        </form>

        <div className="grid gap-4 sm:grid-cols-2">
          {(venues ?? []).map((v) => (
            <article key={v.id} className="rounded-xl p-5 card-surface">
              <h3 className="text-xl">{v.name}</h3>
              <p className="text-sm text-muted-foreground">{v.city}</p>
              <p className="mt-2 text-sm text-primary">
                Capacity {v.capacity} · expecting {v.expected_guests}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => removeVenue.mutate(v.id)}
              >
                Remove
              </Button>
            </article>
          ))}
        </div>
      </TabsContent>

      <TabsContent value="gigs" className="mt-6">
        <OrganizerGigs userId={userId} />
      </TabsContent>

      <TabsContent value="bookings" className="mt-6">
        <BookingList
          bookings={bookings ?? []}
          canCancel
          emptyText="You haven't sent any booking requests yet."
        />
      </TabsContent>
    </Tabs>
  );
}