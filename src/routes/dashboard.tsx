import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarCheck, Inbox, Link2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { AvailabilityCalendar } from "@/components/AvailabilityCalendar";
import { ArtistLinksEditor } from "@/components/ArtistLinksEditor";
import { MessageThreadDialog } from "@/components/MessageThread";
import { EmptyState } from "@/components/EmptyState";
import { CreateArtistProfileForm } from "@/components/CreateArtistProfileForm";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { setBookingStatus } from "@/lib/booking.functions";
import { formatNpr, formatRange } from "@/lib/format";
import { parseArtistLinks } from "@/lib/links";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Artist dashboard — GigLink" },
      {
        name: "description",
        content:
          "Manage your booking requests, availability calendar and gig applications as a GigLink artist.",
      },
      { property: "og:title", content: "Artist dashboard — GigLink" },
      {
        property: "og:description",
        content: "Confirm bookings and keep your availability current.",
      },
    ],
  }),
  component: ArtistDashboard,
});

function ArtistDashboard() {
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();
  const decide = useServerFn(setBookingStatus);
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["artist-dashboard", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: artist } = await supabase
        .from("artists")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (!artist) return { artist: null, bookings: [], availability: [], applications: [] };

      const [bookings, availability, applications] = await Promise.all([
        supabase
          .from("bookings")
          .select("*, venues(name, max_capacity)")
          .eq("artist_id", artist.id)
          .order("event_start"),
        supabase.from("artist_availability").select("date, status").eq("artist_id", artist.id),
        supabase
          .from("gig_applications")
          .select("*, gigs(title, event_start, event_end)")
          .eq("artist_id", artist.id)
          .order("created_at", { ascending: false }),
      ]);

      const organizerIds = [
        ...new Set(
          (bookings.data ?? []).map((b) => b.organizer_id).filter((id): id is string => !!id),
        ),
      ];
      const organizerNames: Record<string, string> = {};
      if (organizerIds.length > 0) {
        const { data: organizers } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", organizerIds);
        for (const o of organizers ?? []) {
          organizerNames[o.id] = o.full_name || "Organizer";
        }
      }

      return {
        artist,
        bookings: bookings.data ?? [],
        availability: (availability.data ?? []) as { date: string; status: "open" | "blocked" }[],
        applications: applications.data ?? [],
        organizerNames,
      };
    },
  });

  async function respond(bookingId: string, status: "confirmed" | "declined") {
    setBusyId(bookingId);
    try {
      await decide({ data: { bookingId, status } });
      toast.success(status === "confirmed" ? "Booking confirmed." : "Booking declined.");
      void queryClient.invalidateQueries({ queryKey: ["artist-dashboard"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update this booking.");
    } finally {
      setBusyId(null);
    }
  }

  async function toggleAvailability(date: string, next: "open" | "blocked") {
    if (!data?.artist) return;
    if (next === "blocked") {
      await supabase
        .from("artist_availability")
        .upsert(
          { artist_id: data.artist.id, date, status: "blocked" },
          { onConflict: "artist_id,date" },
        );
    } else {
      await supabase
        .from("artist_availability")
        .delete()
        .eq("artist_id", data.artist.id)
        .eq("date", date);
    }
    void queryClient.invalidateQueries({ queryKey: ["artist-dashboard"] });
  }

  if (loading || isLoading) {
    return <p className="mx-auto max-w-5xl px-4 py-12 text-muted-foreground">Loading…</p>;
  }
  if (!user) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12">
        <p className="text-muted-foreground">Please sign in to view your artist dashboard.</p>
        <Button asChild className="mt-4">
          <Link to="/auth">Sign in</Link>
        </Button>
      </div>
    );
  }
  if (!data?.artist) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12">
        <CreateArtistProfileForm userId={user.id} />
      </div>
    );
  }

  const pending = data.bookings.filter((b) => b.status === "pending");
  const upcoming = data.bookings.filter((b) => b.status === "confirmed");

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="font-display text-2xl font-semibold break-words sm:text-3xl">
        {data.artist.name}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">Artist dashboard</p>

      <section className="mt-8">
        <h2 className="font-display text-xl font-semibold">Where people can hear you</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          These links show on your public profile.
        </p>
        <div className="mt-4">
          <ArtistLinksEditor
            artistId={data.artist.id}
            links={parseArtistLinks(data.artist.links)}
            onSaved={() => void queryClient.invalidateQueries({ queryKey: ["artist-dashboard"] })}
          />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-xl font-semibold">Booking requests</h2>
        {pending.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              icon={Inbox}
              title="No pending requests"
              description="When an organizer requests you for a date, it lands here for you to confirm or decline."
            />
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {pending.map((b) => (
              <div key={b.id} className="surface-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium break-words">{b.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatRange(b.event_start, b.event_end)}
                      {b.venues?.name ? ` · ${b.venues.name}` : ""}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {b.expected_attendance} guests · {formatNpr(b.agreed_price)}
                    </p>
                    {b.venues && b.expected_attendance > b.venues.max_capacity && (
                      <p className="mt-2 text-sm text-warning">
                        Expected guests exceed the venue capacity of {b.venues.max_capacity}.
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <MessageThreadDialog
                      bookingId={b.id}
                      counterpartLabel={data.organizerNames[b.organizer_id ?? ""] ?? "Organizer"}
                    />
                    <Button
                      size="sm"
                      disabled={busyId === b.id}
                      onClick={() => respond(b.id, "confirmed")}
                    >
                      Confirm
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === b.id}
                      onClick={() => respond(b.id, "declined")}
                    >
                      Decline
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="font-display text-xl font-semibold">Confirmed schedule</h2>
        {upcoming.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              icon={CalendarCheck}
              title="Nothing confirmed yet"
              description="Confirmed bookings show up here and block the date on your calendar automatically."
            />
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {upcoming.map((b) => (
              <div
                key={b.id}
                className="surface-card flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium break-words">{b.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatRange(b.event_start, b.event_end)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <MessageThreadDialog
                    bookingId={b.id}
                    counterpartLabel={data.organizerNames[b.organizer_id ?? ""] ?? "Organizer"}
                  />
                  <StatusBadge status={b.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="font-display text-xl font-semibold">Availability</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Tap a date to block or unblock it. Confirmed bookings are blocked automatically.
        </p>
        <div className="mt-4 scroll-x">
          <AvailabilityCalendar
            availability={data.availability}
            bookings={data.bookings}
            editable
            onToggle={toggleAvailability}
          />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-xl font-semibold">My applications</h2>
        {data.applications.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              icon={Link2}
              title="No applications yet"
              description="Apply to an open gig and track the organizer's response here."
              action={
                <Button asChild variant="outline">
                  <Link to="/gigs">Browse open gigs</Link>
                </Button>
              }
            />
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {data.applications.map((a) => (
              <div
                key={a.id}
                className="surface-card flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium break-words">{a.gigs?.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {a.gigs && formatRange(a.gigs.event_start, a.gigs.event_end)} ·{" "}
                    {formatNpr(a.quoted_price)}
                  </p>
                </div>
                <StatusBadge status={a.status} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
