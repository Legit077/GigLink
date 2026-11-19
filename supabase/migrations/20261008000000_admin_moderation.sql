-- =====================================================================
-- Admin moderation (run AFTER 20261007000000_capacity_checks.sql)
--  1. Admins can suspend / reinstate an artist profile (artist cannot undo it)
--  2. Admins can delete reviews
-- Safe to re-run.
-- =====================================================================

-- ---------- 1. SUSPEND ARTISTS ----------
alter table public.artists add column if not exists is_suspended boolean not null default false;

drop policy if exists artists_select_public on public.artists;
create policy artists_select_public on public.artists for select
using (
  (is_published and not is_suspended)
  or user_id = auth.uid()
  or public.has_role(auth.uid(), 'admin')
);

create or replace function public.guard_artist_suspension()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or public.has_role(auth.uid(), 'admin') then
    return new;
  end if;
  if tg_op = 'INSERT' and new.is_suspended then
    raise exception 'Only an admin can suspend an artist profile.';
  end if;
  if tg_op = 'UPDATE' and new.is_suspended is distinct from old.is_suspended then
    raise exception 'Only an admin can suspend or reinstate an artist profile.';
  end if;
  return new;
end $$;

drop trigger if exists artists_guard_suspension on public.artists;
create trigger artists_guard_suspension
before insert or update on public.artists
for each row execute function public.guard_artist_suspension();

-- ---------- 2. DELETE REVIEWS ----------
drop policy if exists reviews_delete_admin on public.reviews;
create policy reviews_delete_admin on public.reviews for delete to authenticated
using (public.has_role(auth.uid(), 'admin'));
