-- =====================================================================
-- Venue capacity enforced in the database (run AFTER 20261006000000)
-- Until now this was only checked in the browser, so a direct API call
-- could post a gig or booking larger than the venue allows.
-- Safe to re-run.
-- =====================================================================

-- Demo gig "Patan Folk Festival" had 500 guests at a 450-capacity venue.
update public.gigs
set expected_attendance = 400
where id = '33333333-3333-4333-8333-000000000003'
  and expected_attendance > 450;

create or replace function public.check_venue_capacity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _cap int;
begin
  if new.venue_id is null then
    return new;
  end if;

  select max_capacity into _cap from public.venues where id = new.venue_id;

  if _cap is not null and new.expected_attendance > _cap then
    raise exception 'Expected attendance (%) exceeds the venue capacity (%).',
      new.expected_attendance, _cap;
  end if;

  return new;
end $$;

-- Gigs: check on create, and again only if venue or attendance changes
-- (so closing/filling an older gig is never blocked by this rule).
drop trigger if exists gigs_capacity on public.gigs;
create trigger gigs_capacity
before insert or update of venue_id, expected_attendance on public.gigs
for each row execute function public.check_venue_capacity();

-- Bookings: venue and attendance are frozen after creation, so insert is enough.
drop trigger if exists bookings_capacity on public.bookings;
create trigger bookings_capacity
before insert on public.bookings
for each row execute function public.check_venue_capacity();
