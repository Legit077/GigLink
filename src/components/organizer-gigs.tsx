import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { GigCard } from "@/components/gig-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { acceptGigApplication } from "@/lib/gigs.functions";
import { GENRES } from "@/lib/genres";
import { applicationStatusStyles, type ApplicationStatus, type GigRow } from "@/lib/gigs";

type VenueOption = { id: string; name: string; city: string | null; capacity: number; expected_guests: number };

const blankGig = {
  title: "",
  description: "",
  event_date: "",
  start_time: "",
  duration_hours: "2",
  payment: "",
  city: "",
  location: "",
  venue_id: "",
  expected_attendance: "",
  venue_capacity: "",
  genres: [] as string[],
};

export function OrganizerGigs({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(blankGig);

  const { data: venues } = useQuery({
    queryKey: ["my-venues", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("venues")
        .select("id, name, city, capacity, expected_guests")
        .eq("owner_id", userId);
      if (error) throw error;
      return data as VenueOption[];
    },
  });

  const { data: gigs } = useQuery({
    queryKey: ["my-gigs", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gigs")
        .select("*, venues (name)")
        .eq("organizer_id", userId)
        .order("event_date", { ascending: true });
      if (error) throw error;
      return data.map((g) => ({
        ...g,
        venueName: (g.venues as { name: string } | null)?.name ?? null,
      })) as GigRow[];
    },
  });

  const createGig = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("gigs").insert({
        organizer_id: userId,
        venue_id: form.venue_id || null,
        title: form.title,
        description: form.description || null,
        event_date: form.event_date,
        start_time: form.start_time || null,
        duration_hours: Number(form.duration_hours) || 2,
        payment: form.payment ? Number(form.payment) : null,
        genres: form.genres,
        city: form.city || null,
        location: form.location || null,
        expected_attendance: Number(form.expected_attendance) || 0,
        venue_capacity: Number(form.venue_capacity) || 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Gig published to the board");
      setForm(blankGig);
      queryClient.invalidateQueries({ queryKey: ["my-gigs", userId] });
      queryClient.invalidateQueries({ queryKey: ["gigs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: GigRow["status"] }) => {
      const { error } = await supabase.from("gigs").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-gigs", userId] });
      queryClient.invalidateQueries({ queryKey: ["gigs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeGig = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("gigs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Gig removed");
      queryClient.invalidateQueries({ queryKey: ["my-gigs", userId] });
      queryClient.invalidateQueries({ queryKey: ["gigs"] });
    },
  });

  function pickVenue(id: string) {
    const v = venues?.find((x) => x.id === id);
    setForm((f) => ({
      ...f,
      venue_id: id,
      city: v?.city ?? f.city,
      location: v?.name ?? f.location,
      venue_capacity: v ? String(v.capacity) : f.venue_capacity,
      expected_attendance: v ? String(v.expected_guests) : f.expected_attendance,
    }));
  }

  function toggleGenre(g: string) {
    setForm((f) => ({
      ...f,
      genres: f.genres.includes(g) ? f.genres.filter((x) => x !== g) : [...f.genres, g],
    }));
  }

  return (
    <div className="space-y-8">
      <form
        className="space-y-4 rounded-xl p-6 card-surface"
        onSubmit={(e) => {
          e.preventDefault();
          if (!form.title || !form.event_date) return toast.error("Add a title and a date");
          createGig.mutate();
        }}
      >
        <h2 className="text-2xl">Post a gig</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="g-title">Gig title</Label>
            <Input id="g-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="g-venue">Venue</Label>
            <select
              id="g-venue"
              value={form.venue_id}
              onChange={(e) => pickVenue(e.target.value)}
              className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">No linked venue</option>
              {(venues ?? []).map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="g-date">Event date</Label>
            <Input
              id="g-date"
              type="date"
              value={form.event_date}
              onChange={(e) => setForm({ ...form, event_date: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="g-time">Start time</Label>
            <Input
              id="g-time"
              type="time"
              value={form.start_time}
              onChange={(e) => setForm({ ...form, start_time: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="g-duration">Set length (hours)</Label>
            <Input
              id="g-duration"
              type="number"
              min={0.5}
              step={0.5}
              value={form.duration_hours}
              onChange={(e) => setForm({ ...form, duration_hours: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="g-pay">Payment offered ($)</Label>
            <Input
              id="g-pay"
              type="number"
              min={0}
              value={form.payment}
              onChange={(e) => setForm({ ...form, payment: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="g-city">City</Label>
            <Input id="g-city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="g-loc">Location / address</Label>
            <Input id="g-loc" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="g-att">Expected attendance</Label>
            <Input
              id="g-att"
              type="number"
              min={0}
              value={form.expected_attendance}
              onChange={(e) => setForm({ ...form, expected_attendance: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="g-cap">Maximum venue capacity</Label>
            <Input
              id="g-cap"
              type="number"
              min={0}
              value={form.venue_capacity}
              onChange={(e) => setForm({ ...form, venue_capacity: e.target.value })}
            />
          </div>
        </div>

        <div>
          <Label>Genres you're looking for</Label>
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
          <Label htmlFor="g-desc">Event details</Label>
          <Textarea
            id="g-desc"
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Vibe of the night, sound gear provided, load-in time…"
          />
        </div>

        <Button type="submit" disabled={createGig.isPending} className="bg-stage text-primary-foreground hover:opacity-90">
          {createGig.isPending ? "Publishing…" : "Publish gig"}
        </Button>
      </form>

      <div className="space-y-6">
        <h2 className="text-2xl">Your gigs</h2>
        {(gigs ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No gigs posted yet.</p>
        ) : (
          gigs!.map((gig) => (
            <div key={gig.id} className="space-y-3">
              <GigCard
                gig={gig}
                action={
                  <>
                    {gig.status === "open" ? (
                      <Button size="sm" variant="outline" onClick={() => setStatus.mutate({ id: gig.id, status: "closed" })}>
                        Close applications
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => setStatus.mutate({ id: gig.id, status: "open" })}>
                        Reopen
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => removeGig.mutate(gig.id)}>
                      Delete
                    </Button>
                  </>
                }
              />
              <GigApplications gig={gig} organizerId={userId} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

type ApplicationRow = {
  id: string;
  status: ApplicationStatus;
  message: string | null;
  proposed_fee: number | null;
  artist: { id: string; stage_name: string; city: string | null; genres: string[] } | null;
};

function GigApplications({ gig, organizerId }: { gig: GigRow; organizerId: string }) {
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["gig-applications", gig.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gig_applications")
        .select("id, status, message, proposed_fee, artists (id, stage_name, city, genres)")
        .eq("gig_id", gig.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((row) => ({
        id: row.id,
        status: row.status as ApplicationStatus,
        message: row.message,
        proposed_fee: row.proposed_fee,
        artist: row.artists as ApplicationRow["artist"],
      })) as ApplicationRow[];
    },
  });

  const acceptApp = useServerFn(acceptGigApplication);

  const decide = useMutation({
    mutationFn: async ({ app, status }: { app: ApplicationRow; status: ApplicationStatus }) => {
      if (status === "accepted" && app.artist) {
        await acceptApp({ data: { appId: app.id } });
      } else {
        const { error } = await supabase.from("gig_applications").update({ status }).eq("id", app.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Application updated");
      queryClient.invalidateQueries({ queryKey: ["gig-applications", gig.id] });
      queryClient.invalidateQueries({ queryKey: ["my-gigs"] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["gigs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!data?.length)
    return <p className="pl-1 text-sm text-muted-foreground">No applications for this gig yet.</p>;

  return (
    <div className="space-y-2 rounded-xl border border-border/70 p-4">
      <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Applications ({data.length})
      </h4>
      {data.map((app) => (
        <div key={app.id} className="flex flex-wrap items-center gap-3 border-t border-border/50 pt-3 first:border-0 first:pt-0">
          <div className="min-w-0 flex-1">
            <p className="font-display text-xl">
              {app.artist ? (
                <Link to="/artists/$artistId" params={{ artistId: app.artist.id }} className="hover:text-primary">
                  {app.artist.stage_name}
                </Link>
              ) : (
                "Artist"
              )}
            </p>
            <p className="text-sm text-muted-foreground">
              {app.artist?.city || "Anywhere"}
              {app.artist?.genres?.length ? ` · ${app.artist.genres.slice(0, 3).join(", ")}` : ""}
              {app.proposed_fee ? ` · asks $${app.proposed_fee}` : ""}
            </p>
            {app.message ? <p className="mt-1 text-sm text-muted-foreground">“{app.message}”</p> : null}
          </div>
          <Badge className={applicationStatusStyles[app.status] + " capitalize"}>{app.status}</Badge>
          {app.status === "pending" ? (
            <div className="flex gap-2">
              <Button
                size="sm"
                className="bg-stage text-primary-foreground hover:opacity-90"
                onClick={() => decide.mutate({ app, status: "accepted" })}
              >
                Accept
              </Button>
              <Button size="sm" variant="outline" onClick={() => decide.mutate({ app, status: "rejected" })}>
                Reject
              </Button>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}