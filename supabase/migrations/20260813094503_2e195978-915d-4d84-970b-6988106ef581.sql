
-- Extensions
create extension if not exists btree_gist;

-- Enums
do $$ begin create type public.app_role as enum ('artist','organizer','admin'); exception when duplicate_object then null; end $$;
do $$ begin create type public.artist_type as enum ('band','solo'); exception when duplicate_object then null; end $$;
do $$ begin create type public.gig_status as enum ('open','closed','filled','cancelled'); exception when duplicate_object then null; end $$;
do $$ begin create type public.application_status as enum ('pending','accepted','rejected','withdrawn'); exception when duplicate_object then null; end $$;
do $$ begin create type public.booking_status as enum ('pending','confirmed','declined','cancelled','completed'); exception when duplicate_object then null; end $$;
do $$ begin create type public.availability_status as enum ('open','blocked'); exception when duplicate_object then null; end $$;

-- Shared helpers
create or replace function public.update_updated_at_column()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;

-- profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant select on public.profiles to anon;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

-- user_roles
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare _role public.app_role;
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''), new.email)
  on conflict (id) do nothing;

  _role := case when new.raw_user_meta_data->>'role' in ('artist','organizer')
                then (new.raw_user_meta_data->>'role')::public.app_role
                else 'artist'::public.app_role end;
  insert into public.user_roles (user_id, role) values (new.id, _role)
  on conflict do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- artists
create table if not exists public.artists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  artist_type public.artist_type not null default 'band',
  genres text[] not null default '{}',
  bio text,
  location text not null default 'Kathmandu',
  hourly_rate numeric(10,2) check (hourly_rate is null or hourly_rate >= 0),
  members_count int check (members_count is null or members_count > 0),
  image_url text,
  contact_phone text,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists artists_user_id_idx on public.artists(user_id);
grant select, insert, update, delete on public.artists to authenticated;
grant select on public.artists to anon;
grant all on public.artists to service_role;
alter table public.artists enable row level security;

-- venues
create table if not exists public.venues (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade,
  name text not null,
  venue_type text not null default 'restaurant',
  address text not null default 'Kathmandu',
  max_capacity int not null check (max_capacity > 0),
  description text,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists venues_owner_id_idx on public.venues(owner_id);
grant select, insert, update, delete on public.venues to authenticated;
grant select on public.venues to anon;
grant all on public.venues to service_role;
alter table public.venues enable row level security;

-- gigs
create table if not exists public.gigs (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid references auth.users(id) on delete cascade,
  venue_id uuid references public.venues(id) on delete set null,
  title text not null,
  description text,
  event_start timestamptz not null,
  event_end timestamptz not null,
  expected_attendance int not null default 0 check (expected_attendance >= 0),
  budget numeric(10,2) check (budget is null or budget >= 0),
  genres text[] not null default '{}',
  status public.gig_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gigs_time_order check (event_end > event_start)
);
create index if not exists gigs_start_idx on public.gigs(event_start);
create index if not exists gigs_organizer_idx on public.gigs(organizer_id);
grant select, insert, update, delete on public.gigs to authenticated;
grant select on public.gigs to anon;
grant all on public.gigs to service_role;
alter table public.gigs enable row level security;

-- gig_applications
create table if not exists public.gig_applications (
  id uuid primary key default gen_random_uuid(),
  gig_id uuid not null references public.gigs(id) on delete cascade,
  artist_id uuid not null references public.artists(id) on delete cascade,
  message text,
  quoted_price numeric(10,2) check (quoted_price is null or quoted_price >= 0),
  status public.application_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists gig_applications_active_unique
  on public.gig_applications(gig_id, artist_id) where status <> 'withdrawn';
grant select, insert, update, delete on public.gig_applications to authenticated;
grant all on public.gig_applications to service_role;
alter table public.gig_applications enable row level security;

-- bookings
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists(id) on delete cascade,
  organizer_id uuid references auth.users(id) on delete set null,
  venue_id uuid references public.venues(id) on delete set null,
  gig_id uuid references public.gigs(id) on delete set null,
  title text not null default 'Booking',
  event_start timestamptz not null,
  event_end timestamptz not null,
  expected_attendance int not null default 0 check (expected_attendance >= 0),
  agreed_price numeric(10,2) check (agreed_price is null or agreed_price >= 0),
  notes text,
  status public.booking_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bookings_time_order check (event_end > event_start)
);
create index if not exists bookings_artist_idx on public.bookings(artist_id);
create index if not exists bookings_start_idx on public.bookings(event_start);
alter table public.bookings drop constraint if exists no_overlapping_artist_bookings;
alter table public.bookings add constraint no_overlapping_artist_bookings
  exclude using gist (artist_id with =, tstzrange(event_start, event_end) with &&)
  where (status = 'confirmed');
grant select, insert, update, delete on public.bookings to authenticated;
grant all on public.bookings to service_role;
alter table public.bookings enable row level security;

-- reviews
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists(id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete set null,
  reviewer_id uuid references auth.users(id) on delete set null,
  reviewer_name text not null default 'Organizer',
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);
create index if not exists reviews_artist_idx on public.reviews(artist_id);
grant select, insert, update, delete on public.reviews to authenticated;
grant select on public.reviews to anon;
grant all on public.reviews to service_role;
alter table public.reviews enable row level security;

-- artist_availability
create table if not exists public.artist_availability (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists(id) on delete cascade,
  date date not null,
  status public.availability_status not null default 'open',
  note text,
  created_at timestamptz not null default now(),
  unique (artist_id, date)
);
create index if not exists artist_availability_date_idx on public.artist_availability(artist_id, date);
grant select, insert, update, delete on public.artist_availability to authenticated;
grant select on public.artist_availability to anon;
grant all on public.artist_availability to service_role;
alter table public.artist_availability enable row level security;

-- updated_at triggers
do $$ declare t text;
begin
  foreach t in array array['profiles','artists','venues','gigs','gig_applications','bookings'] loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.update_updated_at_column()', t);
  end loop;
end $$;

-- Ownership helper functions
create or replace function public.owns_artist(_artist_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.artists a where a.id = _artist_id and a.user_id = auth.uid())
$$;

create or replace function public.owns_gig(_gig_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.gigs g where g.id = _gig_id and g.organizer_id = auth.uid())
$$;

-- Policies
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select using (true);
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles for insert to authenticated with check (id = auth.uid());

drop policy if exists user_roles_select_own on public.user_roles;
create policy user_roles_select_own on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

drop policy if exists artists_select_public on public.artists;
create policy artists_select_public on public.artists for select
  using (is_published or user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
drop policy if exists artists_insert_own on public.artists;
create policy artists_insert_own on public.artists for insert to authenticated with check (user_id = auth.uid());
drop policy if exists artists_update_own on public.artists;
create policy artists_update_own on public.artists for update to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'))
  with check (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
drop policy if exists artists_delete_own on public.artists;
create policy artists_delete_own on public.artists for delete to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

drop policy if exists venues_select_public on public.venues;
create policy venues_select_public on public.venues for select using (true);
drop policy if exists venues_manage_own on public.venues;
create policy venues_manage_own on public.venues for all to authenticated
  using (owner_id = auth.uid() or public.has_role(auth.uid(),'admin'))
  with check (owner_id = auth.uid() or public.has_role(auth.uid(),'admin'));

drop policy if exists gigs_select_public on public.gigs;
create policy gigs_select_public on public.gigs for select using (true);
drop policy if exists gigs_manage_own on public.gigs;
create policy gigs_manage_own on public.gigs for all to authenticated
  using (organizer_id = auth.uid() or public.has_role(auth.uid(),'admin'))
  with check (organizer_id = auth.uid() or public.has_role(auth.uid(),'admin'));

drop policy if exists applications_select on public.gig_applications;
create policy applications_select on public.gig_applications for select to authenticated
  using (public.owns_artist(artist_id) or public.owns_gig(gig_id) or public.has_role(auth.uid(),'admin'));
drop policy if exists applications_insert on public.gig_applications;
create policy applications_insert on public.gig_applications for insert to authenticated
  with check (public.owns_artist(artist_id));
drop policy if exists applications_update on public.gig_applications;
create policy applications_update on public.gig_applications for update to authenticated
  using (public.owns_artist(artist_id) or public.owns_gig(gig_id) or public.has_role(auth.uid(),'admin'))
  with check (public.owns_artist(artist_id) or public.owns_gig(gig_id) or public.has_role(auth.uid(),'admin'));

drop policy if exists bookings_select on public.bookings;
create policy bookings_select on public.bookings for select to authenticated
  using (public.owns_artist(artist_id) or organizer_id = auth.uid() or public.has_role(auth.uid(),'admin'));
drop policy if exists bookings_insert on public.bookings;
create policy bookings_insert on public.bookings for insert to authenticated
  with check (organizer_id = auth.uid() or public.has_role(auth.uid(),'admin'));
drop policy if exists bookings_update on public.bookings;
create policy bookings_update on public.bookings for update to authenticated
  using (public.owns_artist(artist_id) or organizer_id = auth.uid() or public.has_role(auth.uid(),'admin'))
  with check (public.owns_artist(artist_id) or organizer_id = auth.uid() or public.has_role(auth.uid(),'admin'));

drop policy if exists reviews_select_public on public.reviews;
create policy reviews_select_public on public.reviews for select using (true);
drop policy if exists reviews_insert on public.reviews;
create policy reviews_insert on public.reviews for insert to authenticated with check (reviewer_id = auth.uid());

drop policy if exists availability_select_public on public.artist_availability;
create policy availability_select_public on public.artist_availability for select using (true);
drop policy if exists availability_manage_own on public.artist_availability;
create policy availability_manage_own on public.artist_availability for all to authenticated
  using (public.owns_artist(artist_id) or public.has_role(auth.uid(),'admin'))
  with check (public.owns_artist(artist_id) or public.has_role(auth.uid(),'admin'));

-- Keep availability calendar in sync with confirmed bookings (visual aid only)
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
  end if;
  return new;
end $$;
drop trigger if exists bookings_sync_availability on public.bookings;
create trigger bookings_sync_availability after insert or update of status on public.bookings
for each row execute function public.sync_availability_on_booking();

-- Demo seed data
insert into public.venues (id, name, venue_type, address, max_capacity, description) values
 ('11111111-1111-4111-8111-000000000001','Purple Haze Rock Bar','venue','Thamel, Kathmandu',200,'Legendary live rock venue in Thamel.'),
 ('11111111-1111-4111-8111-000000000002','Jazz Upstairs','restaurant','Lazimpat, Kathmandu',80,'Intimate jazz listening room.'),
 ('11111111-1111-4111-8111-000000000003','Patan Courtyard Events','event_space','Patan Durbar Square, Lalitpur',450,'Open-air heritage courtyard for festivals.')
on conflict (id) do nothing;

insert into public.artists (id, name, artist_type, genres, bio, location, hourly_rate, members_count, contact_phone) values
 ('22222222-2222-4222-8222-000000000001','Kutumba Echo','band','{"Folk","Fusion"}','Nepali folk instrumental fusion ensemble.','Kathmandu',12000,6,'+977-9800000001'),
 ('22222222-2222-4222-8222-000000000002','Rohit Shrestha','solo','{"Acoustic","Pop"}','Acoustic singer-songwriter playing cafes across the valley.','Lalitpur',4500,1,'+977-9800000002'),
 ('22222222-2222-4222-8222-000000000003','Thamel Riff Machine','band','{"Rock","Blues"}','High-energy rock covers band.','Kathmandu',15000,4,'+977-9800000003'),
 ('22222222-2222-4222-8222-000000000004','Sangeeta Rai','solo','{"Jazz","Soul"}','Jazz vocalist with a full trio option.','Bhaktapur',9000,1,'+977-9800000004')
on conflict (id) do nothing;

insert into public.gigs (id, venue_id, title, description, event_start, event_end, expected_attendance, budget, genres, status) values
 ('33333333-3333-4333-8333-000000000001','11111111-1111-4111-8111-000000000001','Friday Night Rock Session','Two-hour headline slot for a rock act.', now() + interval '7 days' + interval '19 hours', now() + interval '7 days' + interval '22 hours', 180, 20000, '{"Rock"}','open'),
 ('33333333-3333-4333-8333-000000000002','11111111-1111-4111-8111-000000000002','Sunday Jazz Brunch','Relaxed brunch set for jazz vocalist or trio.', now() + interval '10 days' + interval '11 hours', now() + interval '10 days' + interval '14 hours', 70, 12000, '{"Jazz"}','open'),
 ('33333333-3333-4333-8333-000000000003','11111111-1111-4111-8111-000000000003','Patan Folk Festival','Headline folk fusion performance in the courtyard.', now() + interval '14 days' + interval '17 hours', now() + interval '14 days' + interval '20 hours', 500, 60000, '{"Folk","Fusion"}','open')
on conflict (id) do nothing;

insert into public.bookings (id, artist_id, venue_id, title, event_start, event_end, expected_attendance, agreed_price, status) values
 ('44444444-4444-4444-8444-000000000001','22222222-2222-4222-8222-000000000003','11111111-1111-4111-8111-000000000001','Rock Night Headline', now() + interval '3 days' + interval '19 hours', now() + interval '3 days' + interval '22 hours', 160, 18000,'confirmed'),
 ('44444444-4444-4444-8444-000000000002','22222222-2222-4222-8222-000000000001','11111111-1111-4111-8111-000000000003','Courtyard Folk Evening', now() + interval '5 days' + interval '17 hours', now() + interval '5 days' + interval '20 hours', 400, 45000,'confirmed')
on conflict (id) do nothing;

insert into public.reviews (artist_id, reviewer_name, rating, comment) values
 ('22222222-2222-4222-8222-000000000003','Purple Haze Rock Bar',5,'Packed the house, great energy.'),
 ('22222222-2222-4222-8222-000000000001','Patan Courtyard Events',5,'Beautiful set, very professional.'),
 ('22222222-2222-4222-8222-000000000002','Jazz Upstairs',4,'Lovely acoustic afternoon.')
on conflict do nothing;
