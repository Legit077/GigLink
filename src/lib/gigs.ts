export type GigStatus = "open" | "closed" | "filled";
export type ApplicationStatus = "pending" | "accepted" | "rejected" | "withdrawn";

export type GigRow = {
  id: string;
  organizer_id: string;
  venue_id: string | null;
  title: string;
  description: string | null;
  event_date: string;
  start_time: string | null;
  duration_hours: number;
  payment: number | null;
  genres: string[];
  city: string | null;
  location: string | null;
  expected_attendance: number;
  venue_capacity: number;
  status: GigStatus;
  venueName?: string | null;
};

export function formatGigDate(date: string) {
  const d = new Date(`${date}T00:00:00`);
  return {
    day: d.toLocaleDateString(undefined, { day: "2-digit" }),
    month: d.toLocaleDateString(undefined, { month: "short" }).toUpperCase(),
    weekday: d.toLocaleDateString(undefined, { weekday: "short" }),
    year: d.getFullYear(),
    full: d.toLocaleDateString(undefined, {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
  };
}

export function formatTime(time: string | null) {
  return time ? time.slice(0, 5) : null;
}

export const applicationStatusStyles: Record<ApplicationStatus, string> = {
  pending: "bg-secondary text-secondary-foreground",
  accepted: "bg-stage text-primary-foreground",
  rejected: "bg-destructive text-destructive-foreground",
  withdrawn: "bg-muted text-muted-foreground",
};