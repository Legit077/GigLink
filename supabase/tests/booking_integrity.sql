-- =====================================================================
-- GigLink database integrity tests
--
-- How to run: paste this whole file into the Supabase SQL editor and run it.
-- Everything happens inside one transaction that is rolled back at the end,
-- so no data is kept. The last result table lists every check as PASS/FAIL.
--
-- Each check runs as a specific role (service, anon, or a logged-in user)
-- so that row-level security and triggers behave exactly as they do for
-- real requests from the browser.
-- =====================================================================
begin;

create schema t;
create table t.results (n serial, label text, ok boolean, detail text);

-- Run _sql as _who ('service', 'anon' or a user id).
-- _expect = null  -> the statement must succeed
-- _expect = 'xyz' -> the statement must fail with a message containing xyz
create function t.run(_who text, _sql text, _expect text, _label text)
returns void language plpgsql as $$
declare _msg text;
begin
  perform set_config('request.jwt.claim.sub',
    case when _who in ('service', 'anon') then '' else _who end, true);
  if _who = 'anon' then execute 'set local role anon';
  elsif _who <> 'service' then execute 'set local role authenticated';
  end if;
  begin
    execute _sql;
    reset role;
    insert into t.results(label, ok, detail) values (_label, _expect is null,
      case when _expect is null then 'succeeded as expected'
           else 'expected an error containing "' || _expect || '" but it succeeded' end);
  exception when others then
    get stacked diagnostics _msg = message_text;
    reset role;
    insert into t.results(label, ok, detail) values (_label,
      _expect is not null and _msg ilike '%' || _expect || '%',
      case when _expect is null then 'unexpected error: ' || _msg
           else 'error: ' || _msg end);
  end;
end $$;

-- Count rows visible to _who and compare with the expected number.
create function t.count_is(_who text, _sql text, _expected int, _label text)
returns void language plpgsql as $$
declare _n int;
begin
  perform set_config('request.jwt.claim.sub',
    case when _who in ('service', 'anon') then '' else _who end, true);
  if _who = 'anon' then execute 'set local role anon';
  elsif _who <> 'service' then execute 'set local role authenticated';
  end if;
  execute _sql into _n;
  reset role;
  insert into t.results(label, ok, detail)
  values (_label, _n = _expected, 'got ' || _n || ', expected ' || _expected);
end $$;

-- ---------- fixtures (created as the database owner) ----------
insert into auth.users (id, email, raw_user_meta_data) values
  ('a0000000-0000-4000-8000-00000000000a', 'org-a@test.local', '{"role":"organizer","full_name":"Organizer A"}'),
  ('a0000000-0000-4000-8000-00000000000b', 'org-b@test.local', '{"role":"organizer","full_name":"Organizer B"}'),
  ('a0000000-0000-4000-8000-00000000000c', 'artist@test.local', '{"role":"artist","full_name":"Artist C"}'),
  ('a0000000-0000-4000-8000-00000000000d', 'admin@test.local', '{"role":"artist","full_name":"Admin D"}');
insert into public.user_roles (user_id, role) values ('a0000000-0000-4000-8000-00000000000d', 'admin');

insert into public.artists (id, user_id, name) values
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000000c', 'Test Band');
insert into public.venues (id, owner_id, name, max_capacity) values
  ('c0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000000a', 'Small Room', 100);

-- Confirmed booking B1: day +10, 18:00-21:00 (UTC)
insert into public.bookings (id, artist_id, organizer_id, title, event_start, event_end, status) values
  ('d0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001',
   'a0000000-0000-4000-8000-00000000000a', 'B1',
   date_trunc('day', now()) + interval '10 days 18 hours',
   date_trunc('day', now()) + interval '10 days 21 hours', 'confirmed');

-- =====================================================================
-- 1. DOUBLE-BOOKING PROTECTION
-- =====================================================================
select t.run('service', $q$
  insert into public.bookings (artist_id, organizer_id, title, event_start, event_end, status) values
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000000b', 'Overlap',
   date_trunc('day', now()) + interval '10 days 19 hours',
   date_trunc('day', now()) + interval '10 days 22 hours', 'confirmed')$q$,
  'no_overlapping_artist_bookings', '1.1 overlapping confirmed booking is rejected by the exclusion constraint');

select t.run('service', $q$
  insert into public.bookings (artist_id, organizer_id, title, event_start, event_end, status) values
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000000b', 'Back to back',
   date_trunc('day', now()) + interval '10 days 21 hours',
   date_trunc('day', now()) + interval '10 days 23 hours', 'confirmed')$q$,
  null, '1.2 back-to-back confirmed booking is allowed');

select t.run('a0000000-0000-4000-8000-00000000000a', $q$
  insert into public.bookings (id, artist_id, organizer_id, title, event_start, event_end, status) values
  ('d0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001',
   'a0000000-0000-4000-8000-00000000000a', 'P1',
   date_trunc('day', now()) + interval '10 days 19 hours',
   date_trunc('day', now()) + interval '10 days 20 hours', 'pending')$q$,
  null, '1.3 overlapping PENDING request is allowed (only confirmed bookings block)');

select t.run('a0000000-0000-4000-8000-00000000000c', $q$
  update public.bookings set status = 'confirmed'
  where id = 'd0000000-0000-4000-8000-000000000002'$q$,
  'no_overlapping_artist_bookings', '1.4 artist cannot confirm a pending request that now overlaps');

-- =====================================================================
-- 2. WHO MAY DO WHAT
-- =====================================================================
select t.run('a0000000-0000-4000-8000-00000000000a', $q$
  insert into public.bookings (artist_id, organizer_id, title, event_start, event_end, status) values
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000000a', 'Self-confirmed',
   date_trunc('day', now()) + interval '30 days 18 hours',
   date_trunc('day', now()) + interval '30 days 20 hours', 'confirmed')$q$,
  'row-level security', '2.1 organizer cannot create an already-confirmed booking');

select t.run('a0000000-0000-4000-8000-00000000000a', $q$
  update public.bookings set status = 'confirmed'
  where id = 'd0000000-0000-4000-8000-000000000002'$q$,
  'Only the artist', '2.2 organizer cannot confirm their own request');

select t.count_is('a0000000-0000-4000-8000-00000000000b',
  $q$select count(*) from public.bookings where id = 'd0000000-0000-4000-8000-000000000002'$q$,
  0, '2.3 an unrelated organizer cannot even see someone else''s booking');

select t.run('a0000000-0000-4000-8000-00000000000c', $q$
  update public.bookings set status = 'declined'
  where id = 'd0000000-0000-4000-8000-000000000002'$q$,
  null, '2.4 artist can decline a pending request');

select t.run('a0000000-0000-4000-8000-00000000000c', $q$
  update public.bookings set status = 'confirmed'
  where id = 'd0000000-0000-4000-8000-000000000002'$q$,
  'cannot be moved', '2.5 a declined booking cannot be revived');

select t.run('a0000000-0000-4000-8000-00000000000a', $q$
  update public.bookings set agreed_price = 1
  where id = 'd0000000-0000-4000-8000-000000000002'$q$,
  'cannot be changed', '2.6 booking price is frozen after creation');

select t.run('anon', 'select * from public.profiles', 'permission denied',
  '2.7 anonymous visitors cannot read profiles (emails / phones)');

-- =====================================================================
-- 3. VENUE CAPACITY
-- =====================================================================
select t.run('a0000000-0000-4000-8000-00000000000a', $q$
  insert into public.bookings (artist_id, organizer_id, venue_id, title, event_start, event_end, expected_attendance, status) values
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000000a',
   'c0000000-0000-4000-8000-000000000001', 'Too big',
   date_trunc('day', now()) + interval '40 days 18 hours',
   date_trunc('day', now()) + interval '40 days 20 hours', 150, 'pending')$q$,
  'exceeds the venue capacity', '3.1 booking above venue capacity is rejected by the database');

select t.run('a0000000-0000-4000-8000-00000000000a', $q$
  insert into public.gigs (organizer_id, venue_id, title, event_start, event_end, expected_attendance) values
  ('a0000000-0000-4000-8000-00000000000a', 'c0000000-0000-4000-8000-000000000001', 'Too big gig',
   date_trunc('day', now()) + interval '40 days 18 hours',
   date_trunc('day', now()) + interval '40 days 20 hours', 150)$q$,
  'exceeds the venue capacity', '3.2 gig above venue capacity is rejected by the database');

-- =====================================================================
-- 4. ACCEPTING A GIG APPLICATION IS ALL-OR-NOTHING
-- =====================================================================
-- G1 clashes with confirmed booking B1, G2 is free.
select t.run('a0000000-0000-4000-8000-00000000000a', $q$
  insert into public.gigs (id, organizer_id, venue_id, title, event_start, event_end, expected_attendance) values
  ('e0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000000a',
   'c0000000-0000-4000-8000-000000000001', 'Clashing gig',
   date_trunc('day', now()) + interval '10 days 19 hours',
   date_trunc('day', now()) + interval '10 days 20 hours', 50),
  ('e0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-00000000000a',
   'c0000000-0000-4000-8000-000000000001', 'Free gig',
   date_trunc('day', now()) + interval '20 days 18 hours',
   date_trunc('day', now()) + interval '20 days 20 hours', 50)$q$,
  null, '4.0 organizer can post gigs');

select t.run('a0000000-0000-4000-8000-00000000000c', $q$
  insert into public.gig_applications (id, gig_id, artist_id, quoted_price) values
  ('f0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 5000),
  ('f0000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001', 6000)$q$,
  null, '4.1 artist can apply to open gigs');

select t.run('a0000000-0000-4000-8000-00000000000b', $q$
  select public.accept_gig_application('f0000000-0000-4000-8000-000000000002')$q$,
  'Only the gig organizer', '4.2 a different organizer cannot accept the application');

select t.run('a0000000-0000-4000-8000-00000000000a', $q$
  select public.accept_gig_application('f0000000-0000-4000-8000-000000000001')$q$,
  'no_overlapping_artist_bookings', '4.3 accepting an application that clashes fails');

select t.count_is('service',
  $q$select count(*) from public.gig_applications where id = 'f0000000-0000-4000-8000-000000000001' and status = 'pending'$q$,
  1, '4.4 ...and the application is still pending (rolled back)');
select t.count_is('service',
  $q$select count(*) from public.gigs where id = 'e0000000-0000-4000-8000-000000000001' and status = 'open'$q$,
  1, '4.5 ...and the gig is still open (rolled back)');

select t.run('a0000000-0000-4000-8000-00000000000a', $q$
  select public.accept_gig_application('f0000000-0000-4000-8000-000000000002')$q$,
  null, '4.6 accepting a free slot succeeds');
select t.count_is('service',
  $q$select count(*) from public.bookings where gig_id = 'e0000000-0000-4000-8000-000000000002' and status = 'confirmed'$q$,
  1, '4.7 ...a confirmed booking was created');
select t.count_is('service',
  $q$select count(*) from public.gigs where id = 'e0000000-0000-4000-8000-000000000002' and status = 'filled'$q$,
  1, '4.8 ...and the gig is marked filled');

-- =====================================================================
-- 5. REVIEWS
-- =====================================================================
insert into public.bookings (id, artist_id, organizer_id, title, event_start, event_end, status) values
  ('d0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000001',
   'a0000000-0000-4000-8000-00000000000a', 'Past gig',
   date_trunc('day', now()) - interval '5 days' + interval '18 hours',
   date_trunc('day', now()) - interval '5 days' + interval '21 hours', 'confirmed');

select t.run('a0000000-0000-4000-8000-00000000000a', $q$
  insert into public.reviews (artist_id, booking_id, reviewer_id, rating) values
  ('b0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000003',
   'a0000000-0000-4000-8000-00000000000a', 5)$q$,
  'row-level security', '5.1 no review before the booking is completed');

select t.run('a0000000-0000-4000-8000-00000000000a', $q$
  update public.bookings set status = 'completed' where id = 'd0000000-0000-4000-8000-000000000003'$q$,
  null, '5.2 organizer can complete a booking after the event ended');

select t.run('a0000000-0000-4000-8000-00000000000a', $q$
  insert into public.reviews (id, artist_id, booking_id, reviewer_id, reviewer_name, rating) values
  ('90000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001',
   'd0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-00000000000a', 'Fake Name', 5)$q$,
  null, '5.3 organizer can review a completed booking');

select t.count_is('service',
  $q$select count(*) from public.reviews where id = '90000000-0000-4000-8000-000000000001' and reviewer_name = 'Organizer A'$q$,
  1, '5.4 reviewer name is set by the database, not the browser');

select t.run('a0000000-0000-4000-8000-00000000000a', $q$
  insert into public.reviews (artist_id, booking_id, reviewer_id, rating) values
  ('b0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000003',
   'a0000000-0000-4000-8000-00000000000a', 4)$q$,
  'reviews_one_per_booking', '5.5 only one review per booking');

select t.run('a0000000-0000-4000-8000-00000000000a',
  $q$delete from public.reviews where id = '90000000-0000-4000-8000-000000000001'$q$,
  null, '5.6 organizer runs a delete on a review...');
select t.count_is('service',
  $q$select count(*) from public.reviews where id = '90000000-0000-4000-8000-000000000001'$q$,
  1, '5.7 ...but nothing was deleted (only admins may delete reviews)');

select t.run('a0000000-0000-4000-8000-00000000000d',
  $q$delete from public.reviews where id = '90000000-0000-4000-8000-000000000001'$q$,
  null, '5.8 admin runs a delete on the review...');
select t.count_is('service',
  $q$select count(*) from public.reviews where id = '90000000-0000-4000-8000-000000000001'$q$,
  0, '5.9 ...and it is gone');

-- =====================================================================
-- 6. ADMIN MODERATION
-- =====================================================================
select t.run('a0000000-0000-4000-8000-00000000000c',
  $q$update public.artists set is_suspended = true where id = 'b0000000-0000-4000-8000-000000000001'$q$,
  'Only an admin', '6.1 an artist cannot suspend or un-suspend their own profile');

select t.run('a0000000-0000-4000-8000-00000000000d',
  $q$update public.artists set is_suspended = true where id = 'b0000000-0000-4000-8000-000000000001'$q$,
  null, '6.2 admin can suspend an artist');
select t.count_is('anon',
  $q$select count(*) from public.artists where id = 'b0000000-0000-4000-8000-000000000001'$q$,
  0, '6.3 a suspended artist disappears from the public directory');
select t.count_is('a0000000-0000-4000-8000-00000000000c',
  $q$select count(*) from public.artists where id = 'b0000000-0000-4000-8000-000000000001'$q$,
  1, '6.4 ...but the artist can still see their own profile');

select t.run('a0000000-0000-4000-8000-00000000000d',
  $q$update public.artists set is_suspended = false where id = 'b0000000-0000-4000-8000-000000000001'$q$,
  null, '6.5 admin can reinstate the artist');
select t.count_is('anon',
  $q$select count(*) from public.artists where id = 'b0000000-0000-4000-8000-000000000001'$q$,
  1, '6.6 the artist is public again');

-- ---------- summary ----------
select case when ok then 'PASS' else 'FAIL' end as result, label, detail
from (
  select 0 as n, 'SUMMARY' as label, bool_and(ok) as ok,
         count(*) filter (where ok) || ' of ' || count(*) || ' checks passed' as detail
  from t.results
  union all
  select n, label, ok, detail from t.results
) r
order by n;

rollback;
