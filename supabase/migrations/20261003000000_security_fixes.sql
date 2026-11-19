-- =====================================================================
-- Security fixes
--  1. profiles (emails / phones) were readable by anyone, even logged out
--  2. bookings could be confirmed/edited by the wrong party straight
--     from the browser, bypassing the app's server checks
-- Safe to re-run.
-- =====================================================================

-- ---------- 1. PROFILES PRIVACY ----------
revoke select on public.profiles from anon;

drop policy if exists profiles_select on public.profiles;
drop policy if exists profiles_select_scoped on public.profiles;

create policy profiles_select_scoped on public.profiles
for select to authenticated
using (
  id = auth.uid()
  or public.has_role(auth.uid(), 'admin')
  -- I'm an artist: show organizers who booked me
  or exists (
    select 1 from public.bookings b
    where b.organizer_id = profiles.id
      and public.owns_artist(b.artist_id)
  )
  -- I'm an organizer: show the owners of artists I booked
  or exists (
    select 1 from public.bookings b
    join public.artists a on a.id = b.artist_id
    where b.organizer_id = auth.uid()
      and a.user_id = profiles.id
  )
);

-- ---------- 2. BOOKING PERMISSION GUARD ----------
-- Runs on every UPDATE of a booking, including ones sent directly from
-- the browser. Calls made from the SQL editor / service role have no
-- auth.uid() and are allowed through.
create or replace function public.guard_booking_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _uid uuid := auth.uid();
  _is_admin boolean;
  _is_artist boolean;
  _is_organizer boolean;
begin
  if _uid is null then
    return new;
  end if;

  _is_admin := public.has_role(_uid, 'admin');
  if _is_admin then
    return new;
  end if;

  _is_artist := exists (
    select 1 from public.artists a where a.id = old.artist_id and a.user_id = _uid
  );
  _is_organizer := old.organizer_id = _uid;

  -- Core booking terms can never be edited after creation
  if new.artist_id    is distinct from old.artist_id
     or new.organizer_id is distinct from old.organizer_id
     or new.event_start  is distinct from old.event_start
     or new.event_end    is distinct from old.event_end
     or new.agreed_price is distinct from old.agreed_price then
    raise exception 'Booking terms cannot be changed after the request is created.';
  end if;

  if new.status is distinct from old.status then
    if new.status in ('confirmed', 'declined') and not _is_artist then
      raise exception 'Only the artist can confirm or decline a booking request.';
    end if;
    if new.status = 'completed' and not _is_organizer then
      raise exception 'Only the organizer can mark a booking as completed.';
    end if;
    if new.status = 'cancelled' and not (_is_artist or _is_organizer) then
      raise exception 'Only the artist or the organizer can cancel a booking.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists bookings_guard_update on public.bookings;
create trigger bookings_guard_update
before update on public.bookings
for each row execute function public.guard_booking_update();
