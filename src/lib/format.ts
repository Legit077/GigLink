const DATE_OPTS: Intl.DateTimeFormatOptions = {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "Asia/Kathmandu",
};

const TIME_OPTS: Intl.DateTimeFormatOptions = {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: "Asia/Kathmandu",
};

export function formatDate(value: string | Date): string {
  return new Intl.DateTimeFormat("en-GB", DATE_OPTS).format(new Date(value));
}

export function formatTime(value: string | Date): string {
  return new Intl.DateTimeFormat("en-GB", TIME_OPTS).format(new Date(value));
}

export function formatRange(start: string | Date, end: string | Date): string {
  return `${formatDate(start)}, ${formatTime(start)} – ${formatTime(end)}`;
}

export function formatNpr(value: number | null | undefined): string {
  if (value === null || value === undefined) return "Negotiable";
  return `NPR ${Math.round(value).toLocaleString("en-IN")}`;
}

/**
 * Nepal has no daylight saving, so the offset is a constant +05:45.
 * Every wall-clock value the user types is interpreted in Nepal time,
 * no matter where the browser (or the SSR server) happens to be.
 */
const NPT_OFFSET = "+05:45";
const NPT_ZONE = "Asia/Kathmandu";

/** Convert a datetime-local input value (Nepal wall time) to an ISO string. */
export function localInputToIso(value: string): string {
  const withSeconds = value.length === 16 ? `${value}:00` : value;
  return new Date(`${withSeconds}${NPT_OFFSET}`).toISOString();
}

/** Convert an ISO timestamp to a datetime-local input value in Nepal time. */
export function isoToLocalInput(value: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: NPT_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

/** YYYY-MM-DD of a calendar cell built from local year/month/day numbers. */
export function dateKey(value: string | Date): string {
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** YYYY-MM-DD of a real moment in time, as seen in Nepal. */
export function nptDateKey(value: string | Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: NPT_ZONE }).format(new Date(value));
}

/** Every Nepal calendar day (YYYY-MM-DD) touched by a time range, inclusive. */
export function nptDaysBetween(start: string | Date, end: string | Date): string[] {
  const last = nptDateKey(end);
  const cursor = new Date(start);
  const days: string[] = [];
  let day = nptDateKey(cursor);
  while (day <= last) {
    days.push(day);
    cursor.setTime(cursor.getTime() + 86_400_000);
    day = nptDateKey(cursor);
  }
  return days;
}
