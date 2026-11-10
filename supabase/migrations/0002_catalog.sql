-- MODULE: catalog (Member B). Run second.
create table public.categories (
  id serial primary key,
  name text not null unique
);
alter table public.categories enable row level security;
create policy categories_read on public.categories
  for select to authenticated using (true);

insert into public.categories (name) values
  ('Books'), ('Cycles'), ('Electronics'), ('Lab gear'), ('Hostel items')
on conflict (name) do nothing;

create table public.items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  category_id int not null references public.categories(id),
  title text not null check (char_length(title) between 3 and 120),
  description text not null default '' check (char_length(description) <= 2000),
  condition text not null check (condition in ('new', 'like_new', 'good', 'fair')),
  listing_type text not null check (listing_type in ('rent', 'sell', 'both')),
  rent_price_per_day numeric(10, 2) check (rent_price_per_day >= 0),
  sale_price numeric(10, 2) check (sale_price >= 0),
  deposit numeric(10, 2) not null default 0 check (deposit >= 0),
  pickup_area text not null default '',
  image_path text,
  status text not null default 'active'
    check (status in ('active', 'unavailable', 'sold', 'removed')),
  search_vector tsvector generated always as (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, ''))
  ) stored,
  created_at timestamptz not null default now(),
  check (listing_type = 'sell' or rent_price_per_day is not null),
  check (listing_type = 'rent' or sale_price is not null)
);

create index items_search_idx on public.items using gin (search_vector);
create index items_owner_idx on public.items (owner_id);
create index items_status_created_idx on public.items (status, created_at desc);

alter table public.items enable row level security;
create policy items_read on public.items
  for select to authenticated using (status = 'active' or owner_id = auth.uid() or public.is_admin());
create policy items_insert on public.items
  for insert to authenticated with check (owner_id = auth.uid());
create policy items_update on public.items
  for update to authenticated
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());
create policy items_delete on public.items
  for delete to authenticated using (owner_id = auth.uid());

-- Photo storage: public read, users write only inside their own folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('item-images', 'item-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy item_images_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'item-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy item_images_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'item-images' and (storage.foldername(name))[1] = auth.uid()::text);
