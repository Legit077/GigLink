-- Booking-anchored in-app messaging (closes the proposal's messaging gap).
-- Each thread is scoped to a single booking; only the artist owner and the
-- organizer on that booking may read or post to it.

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  constraint messages_body_not_blank check (char_length(btrim(body)) between 1 and 4000)
);
create index if not exists messages_booking_created_idx
  on public.messages(booking_id, created_at);

grant select, insert on public.messages to authenticated;
grant all on public.messages to service_role;
alter table public.messages enable row level security;

-- Messages are visible only to that booking's two participants (or an admin).
create or replace function public.in_booking(_booking_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.bookings b
    where b.id = _booking_id
      and (public.owns_artist(b.artist_id) or b.organizer_id = auth.uid())
  )
$$;

drop policy if exists messages_select on public.messages;
create policy messages_select on public.messages for select to authenticated
  using (public.in_booking(booking_id) or public.has_role(auth.uid(), 'admin'));

drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and (public.in_booking(booking_id) or public.has_role(auth.uid(), 'admin'))
  );

-- Live updates for the chat thread.
alter table public.messages replica identity full;
do $$
begin
  alter publication supabase_realtime add table public.messages;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
