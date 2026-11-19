import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { dateKey, nptDateKey, nptDaysBetween } from "@/lib/format";

export type AvailabilityRow = { date: string; status: "open" | "blocked" };
export type BookedRange = { event_start: string; event_end: string; status: string };

type Props = {
  availability: AvailabilityRow[];
  bookings?: BookedRange[];
  editable?: boolean;
  onToggle?: (isoDate: string, next: "open" | "blocked") => void;
};

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function AvailabilityCalendar({
  availability,
  bookings = [],
  editable = false,
  onToggle,
}: Props) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));

  const blocked = useMemo(
    () => new Set(availability.filter((a) => a.status === "blocked").map((a) => a.date)),
    [availability],
  );

  const bookedDays = useMemo(() => {
    const set = new Set<string>();
    for (const b of bookings) {
      if (b.status !== "confirmed") continue;
      for (const day of nptDaysBetween(b.event_start, b.event_end)) set.add(day);
    }
    return set;
  }, [bookings]);

  const pendingDays = useMemo(() => {
    const set = new Set<string>();
    for (const b of bookings) {
      if (b.status !== "pending") continue;
      for (const day of nptDaysBetween(b.event_start, b.event_end)) set.add(day);
    }
    return set;
  }, [bookings]);

  const cells = useMemo(() => {
    const first = startOfMonth(month);
    const offset = first.getDay();
    const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const out: (Date | null)[] = Array.from({ length: offset }, () => null);
    for (let i = 1; i <= daysInMonth; i++) {
      out.push(new Date(month.getFullYear(), month.getMonth(), i));
    }
    return out;
  }, [month]);

  const today = nptDateKey(new Date());

  return (
    <div className="surface-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Previous month"
          onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <p className="font-display text-base font-semibold">
          {month.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
        </p>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Next month"
          onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={`${d}-${i}`} className="py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (!d) return <div key={`empty-${i}`} />;
          const key = dateKey(d);
          const isBooked = bookedDays.has(key);
          const isBlocked = blocked.has(key);
          const isPending = pendingDays.has(key);
          const past = key < today;

          return (
            <button
              key={key}
              type="button"
              disabled={!editable || isBooked || past}
              onClick={() => onToggle?.(key, isBlocked ? "open" : "blocked")}
              className={cn(
                "aspect-square rounded-md border text-sm transition-colors",
                past && "opacity-40",
                isBooked
                  ? "border-danger/30 bg-danger/15 text-danger"
                  : isBlocked
                    ? "border-danger/25 bg-danger/10 text-danger"
                    : isPending
                      ? "border-warning/30 bg-warning/15 text-warning"
                      : "border-border bg-surface-2 text-foreground",
                editable && !isBooked && !past && "hover:border-primary/60",
              )}
              title={
                isBooked
                  ? "Confirmed booking"
                  : isBlocked
                    ? "Marked unavailable"
                    : isPending
                      ? "Pending request"
                      : "Available"
              }
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
        <Legend className="bg-surface-2 border-border" label="Available" />
        <Legend className="bg-warning/15 border-warning/30" label="Pending" />
        <Legend className="bg-danger/10 border-danger/25" label="Blocked" />
        <Legend className="bg-danger/15 border-danger/30" label="Booked" />
      </div>
    </div>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("size-3 rounded border", className)} />
      {label}
    </span>
  );
}
