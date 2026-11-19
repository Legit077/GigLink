-- =====================================================================
-- Integrity fixes (run AFTER 20261004000000_workflow_fixes.sql)
--  1. Bookings: no self-confirmed inserts, enforce the status flow in the DB
--  2. artists.contact_phone was publicly readable -> removed
--  3. Review author name is set by the database, not the browser
--  4. One artist profile per user
--  5. Applications only for gigs that are still open and in the future
-- Safe to re-run.
-- =====================================================================

-- ---------- 1. BOOKINGS ----------
-- 1a. A new request is always 'pending'. Only accept_gig_application() may
--     create a 'confirmed' booking (it runs as SECURITY DEFINER below).
drop policy if exists bookings_insert on public.bookings;
create policy bookings_insert on public.bookings for insert to authenticated
with check (
  public.has_role(auth.uid(), 'admin')
  or (
    organizer_id = auth.uid()
    and public.has_role(auth.uid(), 'organizer')
    and status = 'pending'
  )
);

-- accept_gig_application() already verifies auth.uid() owns the gig, so it is
-- safe to let it bypass the policy above. search_path stays pinned.
alter function public.accept_gig_application(uuid) security definer;
alter function public.accept_gig_application(uuid) set search_path = public;
revoke all on function public.accept_gig_application(uuid) from public, anon;
grant execute on function public.accept_gig_application(uuid) to authenticated;

-- 1b. Enforce the status flow + freeze venue/attendance after creation.
create or replace function public.guard_booking_transition()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or public.has_role(auth.uid(), 'admin') then
    return new;
  end if;

  if new.venue_id is distinct from old.venue_id
     or new.expected_attendance is distinct from old.expected_attendance then
    raise exception 'Venue and expected attendance cannot be changed after the request is created.';
  end if;

  if new.status is distinct from old.status then
    if not (
      (old.status = 'pending'   and new.status in ('confirmed', 'declined', 'cancelled'))
      or (old.status = 'confirmed' and new.status in ('completed', 'cancelled'))
    ) then
      raise exception 'A % booking cannot be moved to %.', old.status, new.status;
    end if;

    if new.status = 'completed' and old.event_end > now() then
      raise exception 'A booking can only be completed after the event has ended.';
    end if;
  end if;

  return new;
end $$;

drop trigger if exists bookings_guard_transition on public.bookings;
create trigger bookings_guard_transition
before update on public.bookings
for each row execute function public.guard_booking_transition();

-- ---------- 2. PUBLIC PHONE NUMBER LEAK ----------
alter table public.artists drop column if exists contact_phone;

-- ---------- 3. REVIEW AUTHOR NAME ----------
create or replace function public.set_review_name()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.reviewer_name := coalesce(
    (select nullif(btrim(full_name), '') from public.profiles where id = new.reviewer_id),
    'Organizer'
  );
  return new;
end $$;

drop trigger if exists reviews_set_name on public.reviews;
create trigger reviews_set_name
before insert on public.reviews
for each row execute function public.set_review_name();

-- ---------- 4. ONE ARTIST PROFILE PER USER ----------
-- Stops with a readable message if duplicates already exist, instead of
-- deleting anybody's data. Merge or delete the extra rows, then re-run.
do $$
begin
  if exists (
    select 1 from public.artists
    where user_id is not null
    group by user_id
    having count(*) > 1
  ) then
    raise exception 'Duplicate artist profiles exist for some users. Remove the extra rows from public.artists (same user_id), then run this migration again.';
  end if;
end $$;

create unique index if not exists artists_one_per_user
  on public.artists (user_id)
  where user_id is not null;

-- ---------- 5. APPLICATIONS ONLY FOR OPEN, FUTURE GIGS ----------
drop policy if exists applications_insert on public.gig_applications;
create policy applications_insert on public.gig_applications for insert to authenticated
with check (
  public.owns_artist(artist_id)
  and exists (
    select 1 from public.gigs g
    where g.id = gig_applications.gig_id
      and g.status = 'open'
      and g.event_end > now()
  )
);
