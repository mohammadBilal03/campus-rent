-- 0006: multiple photos + video, "rented out" status, stricter booking checks.
-- ADDITIVE ONLY: creates new tables, functions and triggers. It does not edit existing ones.
-- If 0005 or 0006 is already taken by your teammate's payment SQL, rename this file to the next free number.

-- ===== 1. Photos and video per item =====
create table if not exists public.item_media (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  kind text not null check (kind in ('image', 'video')),
  storage_path text not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists item_media_item_idx on public.item_media (item_id, position);

alter table public.item_media enable row level security;

create policy item_media_read on public.item_media
  for select to authenticated
  using (exists (select 1 from public.items i where i.id = item_id));
create policy item_media_insert on public.item_media
  for insert to authenticated
  with check (exists (select 1 from public.items i where i.id = item_id and i.owner_id = auth.uid()));
create policy item_media_delete on public.item_media
  for delete to authenticated
  using (exists (select 1 from public.items i where i.id = item_id and i.owner_id = auth.uid()));

-- Limits: 8 photos and 1 video per item; files must sit in the uploader's own folder.
create or replace function public.item_media_limits()
returns trigger language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  select count(*) into n from public.item_media where item_id = new.item_id and kind = new.kind;
  if new.kind = 'image' and n >= 8 then raise exception 'You can add up to 8 photos per item'; end if;
  if new.kind = 'video' and n >= 1 then raise exception 'You can add 1 video per item'; end if;
  if auth.uid() is not null and split_part(new.storage_path, '/', 1) <> auth.uid()::text then
    raise exception 'Invalid file path';
  end if;
  return new;
end; $$;

create trigger item_media_limits
  before insert on public.item_media
  for each row execute function public.item_media_limits();

-- Existing cover photos become the first photo in the new table.
insert into public.item_media (item_id, kind, storage_path, position)
select i.id, 'image', i.image_path, 0
from public.items i
where i.image_path is not null
  and not exists (select 1 from public.item_media m where m.item_id = i.id and m.storage_path = i.image_path);

-- New listings: their cover photo is added to the table automatically.
create or replace function public.items_cover_to_media()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.image_path is not null then
    insert into public.item_media (item_id, kind, storage_path, position)
    values (new.id, 'image', new.image_path, 0);
  end if;
  return new;
end; $$;

create trigger items_cover_to_media
  after insert on public.items
  for each row execute function public.items_cover_to_media();

-- Video storage (25 MB per file; the Supabase free plan also has its own upload cap).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('item-videos', 'item-videos', true, 26214400, array['video/mp4', 'video/webm', 'video/quicktime'])
on conflict (id) do nothing;

create policy item_videos_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'item-videos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy item_videos_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'item-videos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ===== 2. Rented-out status (visible to everyone, no personal data) =====
create or replace function public.current_rentals(p_item_ids uuid[])
returns table (item_id uuid, start_date date, end_date date)
language sql stable security definer set search_path = '' as $$
  select b.item_id, min(b.start_date), max(b.end_date)
    from public.bookings b
   where b.item_id = any (p_item_ids)
     and (
       b.status = 'active'
       or (b.status = 'approved'
           and (now() at time zone 'Asia/Kolkata')::date between b.start_date and b.end_date)
     )
   group by b.item_id;
$$;
revoke all on function public.current_rentals(uuid[]) from public, anon;
grant execute on function public.current_rentals(uuid[]) to authenticated;

-- ===== 3. Stricter booking checks (separate triggers, existing ones untouched) =====
-- Reject a request at the moment it is sent if the dates are already rented out.
create or replace function public.bookings_check_availability()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if exists (
    select 1 from public.bookings b
     where b.item_id = new.item_id
       and b.status in ('approved', 'active')
       and daterange(b.start_date, b.end_date, '[]') && daterange(new.start_date, new.end_date, '[]')
  ) then
    raise exception 'This item is already rented out for some of those dates';
  end if;

  if exists (
    select 1 from public.bookings b
     where b.item_id = new.item_id
       and b.renter_id = new.renter_id
       and b.status = 'pending'
       and daterange(b.start_date, b.end_date, '[]') && daterange(new.start_date, new.end_date, '[]')
  ) then
    raise exception 'You already have a pending request for those dates';
  end if;
  return new;
end; $$;

create trigger bookings_check_availability
  before insert on public.bookings
  for each row execute function public.bookings_check_availability();

-- An item with an active or upcoming rental cannot be marked sold.
create or replace function public.items_guard_sold()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'sold' and old.status is distinct from new.status and exists (
    select 1 from public.bookings b
     where b.item_id = new.id
       and (b.status = 'active'
            or (b.status = 'approved' and b.end_date >= (now() at time zone 'Asia/Kolkata')::date))
  ) then
    raise exception 'This item has an active or upcoming rental, so it cannot be marked sold yet';
  end if;
  return new;
end; $$;

create trigger items_guard_sold
  before update on public.items
  for each row execute function public.items_guard_sold();
