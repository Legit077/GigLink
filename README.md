# GigLink

A band and event booking platform for Nepal. Venues and organizers in Kathmandu, Lalitpur,
Bhaktapur, Pokhara, Chitwan, Butwal, Biratnagar, Dharan and other major cities can discover
artists, check live availability and confirm bookings without double bookings.

## Features

- **Artist directory** — search bands and solo musicians by name, genre and city.
- **Availability calendar** — per-artist month view showing open, blocked, pending and booked days.
- **Gig board** — organizers post gigs; artists apply with a message and a quote.
- **Booking conflict detection** — overlapping confirmed bookings are rejected in the app and
  enforced again by a database exclusion constraint.
- **Venue capacity validation** — expected attendance is checked against the venue's capacity.
- **Role-based access** — artist, organizer and admin dashboards with server-side permission checks.

## Tech stack

- TanStack Start (React 19) with file-based routing
- TanStack Query for data fetching
- Tailwind CSS v4 with a semantic dark theme
- PostgreSQL with row-level security, triggers and exclusion constraints

## Getting started

```sh
npm install
cp .env.example .env   # then fill in your Supabase values
npm run dev
```

The app runs on http://localhost:8080.

## Environment variables

Copy `.env.example` to `.env` and fill it in. `SUPABASE_SERVICE_ROLE_KEY` is required for the
booking availability check (it reads other organizers' confirmed bookings on the server). It is a
secret: never prefix it with `VITE_`, never commit `.env`, and never share it in a zip.

## Tests

```sh
npm test
```

## Project layout

```
src/routes        pages and API routes
src/components    shared UI (header, calendar, booking dialog)
src/lib           booking rules, validation schemas, formatting helpers
src/hooks         auth and utility hooks
supabase/         database migrations
```

## Conventions

- All times are displayed in Nepal Time (UTC+5:45); timestamps are stored in UTC.
- Prices are shown in Nepalese rupees (NPR).
- Colors and shadows come from design tokens in `src/styles.css` — do not hardcode colors.
