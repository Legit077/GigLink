import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, CalendarClock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { checkArtistAvailability, requestBooking } from "@/lib/booking.functions";
import type { ConflictBooking } from "@/lib/booking-schemas";
import { formatDate, formatRange, localInputToIso } from "@/lib/format";

type Props = {
  artistId: string;
  artistName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
};

export function BookingRequestDialog({
  artistId,
  artistName,
  open,
  onOpenChange,
  onCreated,
}: Props) {
  const { user } = useAuth();
  const check = useServerFn(checkArtistAvailability);
  const submit = useServerFn(requestBooking);

  const [title, setTitle] = useState("");
  const [venueId, setVenueId] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [attendance, setAttendance] = useState("50");
  const [price, setPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [conflicts, setConflicts] = useState<ConflictBooking[] | null>(null);
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: venues = [] } = useQuery({
    queryKey: ["venues-select"],
    queryFn: async () => {
      const { data } = await supabase.from("venues").select("id, name, max_capacity").order("name");
      return data ?? [];
    },
  });

  const selectedVenue = venues.find((v) => v.id === venueId);
  const attendanceNum = Number(attendance || 0);
  const capacityWarning =
    selectedVenue && attendanceNum > selectedVenue.max_capacity
      ? `Expected guests (${attendanceNum}) exceed ${selectedVenue.name}'s capacity of ${selectedVenue.max_capacity}.`
      : null;

  const timesValid = useMemo(() => {
    if (!start || !end) return false;
    return new Date(end).getTime() > new Date(start).getTime();
  }, [start, end]);

  useEffect(() => {
    if (!open) {
      setConflicts(null);
      setError(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !timesValid || !user) {
      setConflicts(null);
      setBlockedDates([]);
      return;
    }
    let cancelled = false;
    setChecking(true);
    check({
      data: {
        artistId,
        eventStart: localInputToIso(start),
        eventEnd: localInputToIso(end),
      },
    })
      .then((res) => {
        if (!cancelled) {
          setConflicts(res.conflicts);
          setBlockedDates(res.blockedDates);
        }
      })
      .catch(() => {
        if (!cancelled) setConflicts(null);
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, artistId, start, end, timesValid, user, check]);

  const hasConflict = (conflicts?.length ?? 0) > 0;
  const hasBlockedDay = blockedDates.length > 0;

  async function handleSubmit() {
    setError(null);
    if (title.trim().length < 3) return setError("Event name must be at least 3 characters.");
    if (!timesValid) return setError("The event end time must be after the start time.");
    if (attendanceNum < 0) return setError("Expected guests cannot be negative.");
    if (price !== "" && Number(price) < 0) return setError("Budget cannot be negative.");

    setSaving(true);
    try {
      await submit({
        data: {
          artistId,
          venueId: venueId || null,
          title: title.trim(),
          eventStart: localInputToIso(start),
          eventEnd: localInputToIso(end),
          expectedAttendance: attendanceNum,
          agreedPrice: price === "" ? null : Number(price),
          notes: notes.trim() || null,
        },
      });
      toast.success("Booking request sent to the artist.");
      onOpenChange(false);
      onCreated?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "We could not send this booking request.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">Request {artistName}</DialogTitle>
          <DialogDescription>
            Availability is checked against the artist's confirmed bookings before you send.
          </DialogDescription>
        </DialogHeader>

        {!user ? (
          <p className="rounded-md border border-border bg-surface-2 p-4 text-sm text-muted-foreground">
            Please sign in as an organizer to request a booking.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bk-title">Event name</Label>
              <Input
                id="bk-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Friday Night Live"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bk-venue">Venue</Label>
              <select
                id="bk-venue"
                value={venueId}
                onChange={(e) => setVenueId(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-surface-2 px-3 text-sm"
              >
                <option value="">No specific venue</option>
                {venues.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} (capacity {v.max_capacity})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="bk-start">Starts</Label>
                <Input
                  id="bk-start"
                  type="datetime-local"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bk-end">Ends</Label>
                <Input
                  id="bk-end"
                  type="datetime-local"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="bk-att">Expected guests</Label>
                <Input
                  id="bk-att"
                  type="number"
                  min={0}
                  value={attendance}
                  onChange={(e) => setAttendance(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bk-price">Offer (NPR)</Label>
                <Input
                  id="bk-price"
                  type="number"
                  min={0}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="Negotiable"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bk-notes">Notes</Label>
              <Textarea
                id="bk-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            {start && end && !timesValid && (
              <Notice tone="danger" title="Invalid event time">
                The end time must be after the start time.
              </Notice>
            )}

            {capacityWarning && (
              <Notice tone="warning" title="Expected guests exceed venue capacity">
                {capacityWarning} You can still proceed if this is intentional.
              </Notice>
            )}

            {checking && (
              <p className="text-sm text-muted-foreground">Checking artist availability…</p>
            )}

            {hasConflict && (
              <Notice tone="danger" title="Artist unavailable">
                <span>{artistName} already has a confirmed booking that overlaps this slot:</span>
                <ul className="mt-2 space-y-1">
                  {conflicts?.map((c) => (
                    <li key={c.id} className="text-foreground">
                      {formatRange(c.event_start, c.event_end)}
                    </li>
                  ))}
                </ul>
              </Notice>
            )}

            {hasBlockedDay && (
              <Notice tone="danger" title="Artist unavailable">
                {artistName} has marked {blockedDates.map((d) => formatDate(d)).join(", ")} as
                unavailable.
              </Notice>
            )}

            {!hasConflict && !hasBlockedDay && timesValid && !checking && conflicts !== null && (
              <Notice tone="success" title="Artist is available">
                No confirmed booking overlaps this time slot.
              </Notice>
            )}

            {error && (
              <Notice tone="danger" title="Could not send request">
                {error}
              </Notice>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!user || saving || checking || hasConflict || hasBlockedDay || !timesValid}
          >
            {saving ? "Sending…" : "Send booking request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function Notice({
  tone,
  title,
  children,
}: {
  tone: "success" | "warning" | "danger";
  title: string;
  children: React.ReactNode;
}) {
  const styles = {
    success: "border-success/30 bg-success/10 text-success",
    warning: "border-warning/30 bg-warning/10 text-warning",
    danger: "border-danger/30 bg-danger/10 text-danger",
  }[tone];
  const Icon =
    tone === "success" ? CheckCircle2 : tone === "warning" ? AlertTriangle : CalendarClock;

  return (
    <div className={`rounded-md border p-3 text-sm ${styles}`}>
      <p className="flex items-center gap-2 font-medium">
        <Icon className="size-4" />
        {title}
      </p>
      <div className="mt-1 text-muted-foreground">{children}</div>
    </div>
  );
}
