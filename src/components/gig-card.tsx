import { Banknote, Clock, MapPin, Users } from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { formatGigDate, formatTime, type GigRow } from "@/lib/gigs";

export function GigCard({ gig, action }: { gig: GigRow; action?: ReactNode }) {
  const date = formatGigDate(gig.event_date);
  const time = formatTime(gig.start_time);

  return (
    <article className="flex flex-col gap-4 rounded-xl p-5 card-surface sm:flex-row">
      <div className="flex h-fit w-20 shrink-0 flex-col items-center rounded-lg bg-stage px-3 py-3 text-primary-foreground">
        <span className="text-xs font-semibold tracking-widest">{date.month}</span>
        <span className="font-display text-4xl leading-none">{date.day}</span>
        <span className="text-xs opacity-90">{date.weekday}</span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="font-display text-2xl leading-tight">{gig.title}</h3>
            <p className="text-sm text-muted-foreground">
              {date.full}
              {time ? ` · ${time}` : ""} · {gig.duration_hours}h set
            </p>
          </div>
          <Badge variant="secondary" className="capitalize">
            {gig.status}
          </Badge>
        </div>

        {gig.description ? (
          <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{gig.description}</p>
        ) : null}

        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <MapPin className="size-4" />
            {gig.venueName ? `${gig.venueName}` : gig.location || "Venue TBC"}
            {gig.city ? `, ${gig.city}` : ""}
          </span>
          <span className="flex items-center gap-1.5">
            <Users className="size-4" />
            {gig.expected_attendance} expected / {gig.venue_capacity} capacity
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="size-4" />
            {gig.duration_hours} hours
          </span>
          <span className="flex items-center gap-1.5 font-semibold text-primary">
            <Banknote className="size-4" />
            {gig.payment ? `$${gig.payment}` : "Fee negotiable"}
          </span>
        </div>

        {gig.genres.length ? (
          <div className="mt-3 flex flex-wrap gap-1">
            {gig.genres.map((g) => (
              <Badge key={g} variant="outline" className="text-xs">
                {g}
              </Badge>
            ))}
          </div>
        ) : null}

        {action ? <div className="mt-4 flex flex-wrap items-center gap-2">{action}</div> : null}
      </div>
    </article>
  );
}