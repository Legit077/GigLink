import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarCheck, Megaphone } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/StatusBadge";
import { VenueImagesEditor } from "@/components/VenueImagesEditor";
import { MessageThreadDialog } from "@/components/MessageThread";
import { EmptyState } from "@/components/EmptyState";
import { CreateVenueForm } from "@/components/CreateVenueForm";
import { ReviewDialog } from "@/components/ReviewDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { reviewApplication, setBookingStatus } from "@/lib/booking.functions";
import { formatNpr, formatRange, localInputToIso } from "@/lib/format";

export const Route = createFileRoute("/organizer")({
  head: () => ({
    meta: [
      { title: "Organizer dashboard — GigLink" },
      {
        name: "description",
        content:
          "Post gigs, review artist applications and track your confirmed bookings at venues across Nepal.",
      },
      { property: "og:title", content: "Organizer dashboard — GigLink" },
      {
        property: "og:description",
        content: "Manage gigs, applications and bookings in one place.",
      },
    ],
  }),
  component: OrganizerDashboard,
});

function OrganizerDashboard() {
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();
  const decideApp = useServerFn(reviewApplication);
  const decideBooking = useServerFn(setBookingStatus);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    venueId: "",
    start: "",
    end: "",
    attendance: "50",
    budget: "",
    genres: "",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["organizer-dashboard", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [gigs, bookings, venues, myVenues, myReviews] = await Promise.all([
        supabase
          .from("gigs")
          .select("*, venues(name, max_capacity), gig_applications(*, artists(name))")
          .eq("organizer_id", user!.id)
          .order("event_start"),
        supabase
          .from("bookings")
          .select("*, artists(name), venues(name, max_capacity)")
          .eq("organizer_id", user!.id)
          .order("event_start"),
        supabase.from("venues").select("id, name, max_capacity").order("name"),
        supabase.from("venues").select("id, name, images").eq("owner_id", user!.id).order("name"),
        supabase.from("reviews").select("booking_id").eq("reviewer_id", user!.id),
      ]);
      return {
        gigs: gigs.data ?? [],
        bookings: bookings.data ?? [],
        venues: venues.data ?? [],
        myVenues: myVenues.data ?? [],
        reviewedBookingIds: new Set(
          (myReviews.data ?? []).map((r) => r.booking_id).filter((id): id is string => !!id),
        ),
      };
    },
  });

  const selectedVenue = data?.venues.find((v) => v.id === form.venueId);
  const capacityWarning =
    selectedVenue && Number(form.attendance || 0) > selectedVenue.max_capacity
      ? `Expected guests exceed ${selectedVenue.name}'s capacity of ${selectedVenue.max_capacity}.`
      : null;

  async function createGig() {
    if (form.title.trim().length < 3) {
      toast.error("Gig title must be at least 3 characters.");
      return;
    }
    if (!form.start || !form.end || new Date(form.end) <= new Date(form.start)) {
      toast.error("The gig end time must be after the start time.");
      return;
    }
    if (capacityWarning) {
      toast.error(capacityWarning);
      return;
    }
    setBusyId("new-gig");
    const { error } = await supabase.from("gigs").insert({
      organizer_id: user!.id,
      venue_id: form.venueId || null,
      title: form.title.trim(),
      description: form.description.trim() || null,
      event_start: localInputToIso(form.start),
      event_end: localInputToIso(form.end),
      expected_attendance: Number(form.attendance || 0),
      budget: form.budget === "" ? null : Number(form.budget),
      genres: form.genres
        .split(",")
        .map((g) => g.trim())
        .filter(Boolean),
    });
    setBusyId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Gig posted.");
    setCreating(false);
    setForm({ ...form, title: "", description: "", genres: "" });
    void queryClient.invalidateQueries({ queryKey: ["organizer-dashboard"] });
    void queryClient.invalidateQueries({ queryKey: ["gigs"] });
  }

  async function handleApplication(applicationId: string, decision: "accepted" | "rejected") {
    setBusyId(applicationId);
    try {
      await decideApp({ data: { applicationId, decision } });
      toast.success(
        decision === "accepted"
          ? "Application accepted and booking created."
          : "Application rejected.",
      );
      void queryClient.invalidateQueries({ queryKey: ["organizer-dashboard"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update this application.");
    } finally {
      setBusyId(null);
    }
  }

  async function completeBooking(bookingId: string) {
    setBusyId(bookingId);
    try {
      await decideBooking({ data: { bookingId, status: "completed" } });
      toast.success("Booking marked as completed. You can now leave a review.");
      void queryClient.invalidateQueries({ queryKey: ["organizer-dashboard"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update this booking.");
    } finally {
      setBusyId(null);
    }
  }

  async function cancelBooking(bookingId: string) {
    setBusyId(bookingId);
    try {
      await decideBooking({ data: { bookingId, status: "cancelled" } });
      toast.success("Booking cancelled.");
      void queryClient.invalidateQueries({ queryKey: ["organizer-dashboard"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not cancel this booking.");
    } finally {
      setBusyId(null);
    }
  }

  if (loading || isLoading) {
    return <p className="mx-auto max-w-5xl px-4 py-12 text-muted-foreground">Loading…</p>;
  }
  if (!user) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12">
        <p className="text-muted-foreground">Please sign in to manage your events.</p>
        <Button asChild className="mt-4">
          <Link to="/auth">Sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">Organizer dashboard</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Post gigs, review applications and track bookings.
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>Post a gig</Button>
      </div>

      <section className="mt-8">
        <h2 className="font-display text-xl font-semibold">My gigs</h2>
        {data!.gigs.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              icon={Megaphone}
              title="No gigs posted yet"
              description="Post a gig to tell artists the date, budget and what you're after. Applications come back here."
              action={<Button onClick={() => setCreating(true)}>Post a gig</Button>}
            />
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {data!.gigs.map((g) => (
              <article key={g.id} className="surface-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-lg font-semibold break-words">{g.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatRange(g.event_start, g.event_end)}
                      {g.venues?.name ? ` · ${g.venues.name}` : ""}
                    </p>
                  </div>
                  <StatusBadge status={g.status} />
                </div>

                <div className="mt-4 border-t border-border pt-4">
                  <p className="text-sm font-medium">
                    Applications ({g.gig_applications?.length ?? 0})
                  </p>
                  {(g.gig_applications ?? []).length === 0 ? (
                    <p className="mt-2 text-sm text-muted-foreground">
                      No applications yet. Artists browsing the gig board will see this listing.
                    </p>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {g.gig_applications!.map((a) => (
                        <div
                          key={a.id}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-surface-2 p-3"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium break-words">{a.artists?.name}</p>
                            <p className="text-sm text-muted-foreground break-words">
                              {formatNpr(a.quoted_price)}
                              {a.message ? ` · ${a.message}` : ""}
                            </p>
                          </div>
                          {a.status === "pending" ? (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                disabled={busyId === a.id}
                                onClick={() => handleApplication(a.id, "accepted")}
                              >
                                Accept
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={busyId === a.id}
                                onClick={() => handleApplication(a.id, "rejected")}
                              >
                                Reject
                              </Button>
                            </div>
                          ) : (
                            <StatusBadge status={a.status} />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="font-display text-xl font-semibold">My venue photos</h2>
        {data!.myVenues.length === 0 ? (
          <div className="mt-4">
            <CreateVenueForm userId={user!.id} />
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {data!.myVenues.map((v) => (
              <VenueImagesEditor
                key={v.id}
                ownerId={user!.id}
                venueId={v.id}
                venueName={v.name}
                images={v.images ?? []}
                onSaved={() => {
                  void queryClient.invalidateQueries({ queryKey: ["organizer-dashboard"] });
                  void queryClient.invalidateQueries({ queryKey: ["venues"] });
                }}
              />
            ))}
            <CreateVenueForm userId={user!.id} />
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="font-display text-xl font-semibold">My bookings</h2>
        {data!.bookings.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              icon={CalendarCheck}
              title="No bookings yet"
              description="Accept an application, or book an artist directly from their profile, and the booking appears here."
              action={
                <Button asChild variant="outline">
                  <Link to="/gigs">Browse the gig board</Link>
                </Button>
              }
            />
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {data!.bookings.map((b) => (
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
                    {b.venues?.name ? ` · ${b.venues.name}` : ""}
                  </p>
                  {b.venues && b.expected_attendance > b.venues.max_capacity && (
                    <p className="mt-1 text-sm text-warning">
                      Expected guests exceed venue capacity ({b.venues.max_capacity}).
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <StatusBadge status={b.status} />
                  <MessageThreadDialog
                    bookingId={b.id}
                    counterpartLabel={b.artists?.name ?? "Artist"}
                  />
                  {(b.status === "pending" || b.status === "confirmed") && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === b.id}
                      onClick={() => cancelBooking(b.id)}
                    >
                      Cancel
                    </Button>
                  )}
                  {b.status === "confirmed" && new Date(b.event_end) < new Date() && (
                    <Button
                      size="sm"
                      disabled={busyId === b.id}
                      onClick={() => completeBooking(b.id)}
                    >
                      Mark completed
                    </Button>
                  )}
                  {b.status === "completed" && !data!.reviewedBookingIds.has(b.id) && (
                    <ReviewDialog
                      bookingId={b.id}
                      artistId={b.artist_id}
                      artistName={b.artists?.name ?? "this artist"}
                      userId={user!.id}
                      onSaved={() => {
                        void queryClient.invalidateQueries({ queryKey: ["organizer-dashboard"] });
                        void queryClient.invalidateQueries({ queryKey: ["artist"] });
                      }}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Post a gig</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Field label="Title" id="g-title">
              <Input
                id="g-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </Field>
            <Field label="Description" id="g-desc">
              <Textarea
                id="g-desc"
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </Field>
            <Field label="Venue" id="g-venue">
              <select
                id="g-venue"
                value={form.venueId}
                onChange={(e) => setForm({ ...form, venueId: e.target.value })}
                className="h-10 w-full rounded-md border border-input bg-surface-2 px-3 text-sm"
              >
                <option value="">No specific venue</option>
                {data!.venues.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} (capacity {v.max_capacity})
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Starts" id="g-start">
                <Input
                  id="g-start"
                  type="datetime-local"
                  value={form.start}
                  onChange={(e) => setForm({ ...form, start: e.target.value })}
                />
              </Field>
              <Field label="Ends" id="g-end">
                <Input
                  id="g-end"
                  type="datetime-local"
                  value={form.end}
                  onChange={(e) => setForm({ ...form, end: e.target.value })}
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Expected guests" id="g-att">
                <Input
                  id="g-att"
                  type="number"
                  min={0}
                  value={form.attendance}
                  onChange={(e) => setForm({ ...form, attendance: e.target.value })}
                />
              </Field>
              <Field label="Budget (NPR)" id="g-budget">
                <Input
                  id="g-budget"
                  type="number"
                  min={0}
                  value={form.budget}
                  onChange={(e) => setForm({ ...form, budget: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Genres (comma separated)" id="g-genres">
              <Input
                id="g-genres"
                value={form.genres}
                onChange={(e) => setForm({ ...form, genres: e.target.value })}
                placeholder="Rock, Blues"
              />
            </Field>
            {capacityWarning && (
              <p className="rounded-md border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
                {capacityWarning}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreating(false)}>
              Cancel
            </Button>
            <Button onClick={createGig} disabled={busyId === "new-gig"}>
              {busyId === "new-gig" ? "Posting…" : "Post gig"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}
