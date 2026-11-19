-- =====================================================================
-- Workflow fixes (run AFTER 20261003000000_security_fixes.sql)
--  A. Cancelled bookings free up the artist's calendar again
--  B. Reviews: only the organizer of a COMPLETED booking, one per booking
--  C. Applications: only the gig owner can accept/reject; artists can only withdraw
--  D. accept_gig_application(): accept + book + close gig in ONE transaction
--  E. Roles: only organizers can post gigs and create booking requests
-- Safe to re-run.
-- =====================================================================

-- ---------- A. CALENDAR SYNC ----------
create or replace function public.sync_availability_on_booking()
returns trigger language plpgsql security definer set search_path = public as $$
declare d date;
begin
  if new.status = 'confirmed' then
    d := (new.event_start at time zone 'Asia/Kathmandu')::date;
    while d <= (new.event_end at time zone 'Asia/Kathmandu')::date loop
      insert into public.artist_availability (artist_id, date, status, note)
      values (new.artist_id, d, 'blocked', 'Confirmed booking')
      on conflict (artist_id, date) do update set status = 'blocked';
      d := d + 1;
    end loop;

  elsif tg_op = 'UPDATE' and old.status = 'confirmed' and new.status = 'cancelled' then
    -- Free the days this booking blocked, unless another confirmed booking
    -- still covers the same day. Days the artist blocked by hand (no note) stay blocked.
    delete from public.artist_availability av
    where av.artist_id = new.artist_id
      and av.note = 'Confirmed booking'
      and av.date between (new.event_start at time zone 'Asia/Kathmandu')::date
                      and (new.event_end   at time zone 'Asia/Kathmandu')::date
      and not exists (
        select 1 from public.bookings b
        where b.artist_id = new.artist_id
          and b.status = 'confirmed'
          and b.id <> new.id
          and (b.event_start at time zone 'Asia/Kathmandu')::date <= av.date
          and (b.event_end   at time zone 'Asia/Kathmandu')::date >= av.date
      );
  end if;
  return new;
end $$;

-- ---------- B. REVIEWS ----------
drop policy if exists reviews_insert on public.reviews;
create policy reviews_insert on public.reviews for insert to authenticated
with check (
  reviewer_id = auth.uid()
  and exists (
    select 1 from public.bookings b
    where b.id = reviews.booking_id
      and b.organizer_id = auth.uid()
      and b.artist_id = reviews.artist_id
      and b.status = 'completed'
  )
);

-- one review per booking (existing seed reviews without a booking are unaffected)
create unique index if not exists reviews_one_per_booking
  on public.reviews (booking_id) where booking_id is not null;

-- ---------- C. APPLICATION STATUS GUARD ----------
create or replace function public.guard_application_update()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  _uid uuid := auth.uid();
  _owns_gig boolean;
  _owns_artist boolean;
begin
  if _uid is null or public.has_role(_uid, 'admin') then
    return new;
  end if;

  if new.gig_id is distinct from old.gig_id or new.artist_id is distinct from old.artist_id then
    raise exception 'An application cannot be moved to another gig or artist.';
  end if;

  if new.status is distinct from old.status then
    _owns_gig := exists (select 1 from public.gigs g where g.id = old.gig_id and g.organizer_id = _uid);
    _owns_artist := exists (select 1 from public.artists a where a.id = old.artist_id and a.user_id = _uid);

    if new.status in ('accepted', 'rejected') and not _owns_gig then
      raise exception 'Only the gig organizer can accept or reject an application.';
    end if;
    if new.status = 'withdrawn' and not _owns_artist then
      raise exception 'Only the applying artist can withdraw an application.';
    end if;
  end if;

  return new;
end $$;

drop trigger if exists gig_applications_guard_update on public.gig_applications;
create trigger gig_applications_guard_update
before update on public.gig_applications
for each row execute function public.guard_application_update();

-- ---------- D. ATOMIC ACCEPT ----------
-- SECURITY INVOKER: row-level security still applies as the logged-in organizer.
create or replace function public.accept_gig_application(_application_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  _app public.gig_applications%rowtype;
  _gig public.gigs%rowtype;
  _booking_id uuid;
begin
  select * into _app from public.gig_applications where id = _application_id for update;
  if not found then
    raise exception 'That application could not be found, or you do not have access to it.';
  end if;
  if _app.status <> 'pending' then
    raise exception 'This application has already been %.', _app.status;
  end if;

  select * into _gig from public.gigs where id = _app.gig_id for update;
  if not found then
    raise exception 'The gig for this application no longer exists.';
  end if;
  if _gig.organizer_id is distinct from auth.uid() then
    raise exception 'Only the gig organizer can accept applications.';
  end if;
  if _gig.status <> 'open' then
    raise exception 'This gig is no longer open.';
  end if;

  insert into public.bookings (
    artist_id, organizer_id, venue_id, gig_id, title,
    event_start, event_end, expected_attendance, agreed_price, status
  ) values (
    _app.artist_id, auth.uid(), _gig.venue_id, _gig.id, _gig.title,
    _gig.event_start, _gig.event_end, _gig.expected_attendance, _app.quoted_price, 'confirmed'
  ) returning id into _booking_id;

  update public.gig_applications set status = 'accepted' where id = _app.id;
  update public.gig_applications set status = 'rejected'
    where gig_id = _gig.id and id <> _app.id and status = 'pending';
  update public.gigs set status = 'filled' where id = _gig.id;

  return _booking_id;
end $$;

revoke all on function public.accept_gig_application(uuid) from public, anon;
grant execute on function public.accept_gig_application(uuid) to authenticated;

-- ---------- E. ROLE ENFORCEMENT ----------
-- gigs: split the old catch-all policy so INSERT requires the organizer role
drop policy if exists gigs_manage_own on public.gigs;
drop policy if exists gigs_insert_organizer on public.gigs;
drop policy if exists gigs_update_own on public.gigs;
drop policy if exists gigs_delete_own on public.gigs;

create policy gigs_insert_organizer on public.gigs for insert to authenticated
with check (
  public.has_role(auth.uid(), 'admin')
  or (organizer_id = auth.uid() and public.has_role(auth.uid(), 'organizer'))
);
create policy gigs_update_own on public.gigs for update to authenticated
using (organizer_id = auth.uid() or public.has_role(auth.uid(), 'admin'))
with check (organizer_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy gigs_delete_own on public.gigs for delete to authenticated
using (organizer_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

-- bookings: only organizers (or admins) can create booking requests
drop policy if exists bookings_insert on public.bookings;
create policy bookings_insert on public.bookings for insert to authenticated
with check (
  public.has_role(auth.uid(), 'admin')
  or (organizer_id = auth.uid() and public.has_role(auth.uid(), 'organizer'))
);
