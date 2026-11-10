-- MODULE: transactions (Member C). Run third.
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id),
  renter_id uuid not null references public.profiles(id),
  owner_id uuid not null references public.profiles(id),
  start_date date not null,
  end_date date not null,
  status text not null default 'pending' check (
    status in ('pending', 'approved', 'rejected', 'cancelled', 'active', 'completed', 'expired')
  ),
  daily_price_snapshot numeric(10, 2) not null default 0,
  deposit_snapshot numeric(10, 2) not null default 0,
  total_price numeric(10, 2) not null default 0,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  check (end_date >= start_date),
  -- The database itself blocks double booking of approved or active dates.
  constraint no_overlapping_bookings exclude using gist (
    item_id with =,
    daterange(start_date, end_date, '[]') with &&
  ) where (status in ('approved', 'active'))
);

create index bookings_renter_idx on public.bookings (renter_id);
create index bookings_owner_idx on public.bookings (owner_id);
create index bookings_item_idx on public.bookings (item_id);

-- On insert: fill owner and price snapshots from the item; validate the request.
create or replace function public.bookings_before_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
declare it public.items%rowtype;
begin
  select * into it from public.items where id = new.item_id;
  if not found or it.status <> 'active' then
    raise exception 'This item is not available';
  end if;
  if it.listing_type = 'sell' then
    raise exception 'This item is for sale only, not for rent';
  end if;
  if it.owner_id = auth.uid() then
    raise exception 'You cannot book your own item';
  end if;
  if new.start_date < (now() at time zone 'Asia/Kolkata')::date then
    raise exception 'Start date cannot be in the past';
  end if;
  new.owner_id := it.owner_id;
  new.status := 'pending';
  new.daily_price_snapshot := it.rent_price_per_day;
  new.deposit_snapshot := it.deposit;
  new.total_price := it.rent_price_per_day * (new.end_date - new.start_date + 1);
  return new;
end; $$;

create trigger bookings_before_insert
  before insert on public.bookings
  for each row execute function public.bookings_before_insert();

-- On update: only allowed status moves, only by the right person; nothing else may change.
create or replace function public.bookings_enforce_transition()
returns trigger language plpgsql set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if (new.item_id, new.renter_id, new.owner_id, new.start_date, new.end_date, new.total_price)
     is distinct from
     (old.item_id, old.renter_id, old.owner_id, old.start_date, old.end_date, old.total_price) then
    raise exception 'Booking details cannot be changed';
  end if;
  if new.status = old.status then return new; end if;

  if uid = old.owner_id and old.status = 'pending' and new.status in ('approved', 'rejected') then
    new.decided_at := now(); return new;
  elsif uid = old.owner_id and old.status = 'approved' and new.status = 'active' then
    return new;
  elsif uid = old.owner_id and old.status = 'active' and new.status = 'completed' then
    return new;
  elsif uid = old.renter_id and old.status in ('pending', 'approved') and new.status = 'cancelled' then
    return new;
  end if;
  raise exception 'That status change is not allowed';
end; $$;

create trigger bookings_enforce_transition
  before update on public.bookings
  for each row execute function public.bookings_enforce_transition();

-- When one request is approved, reject other pending requests for overlapping dates.
create or replace function public.bookings_after_update()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'approved' and old.status <> 'approved' then
    update public.bookings
       set status = 'rejected', decided_at = now()
     where item_id = new.item_id and id <> new.id and status = 'pending'
       and daterange(start_date, end_date, '[]') && daterange(new.start_date, new.end_date, '[]');
  end if;
  return new;
end; $$;

create trigger bookings_after_update
  after update on public.bookings
  for each row execute function public.bookings_after_update();

alter table public.bookings enable row level security;
create policy bookings_read on public.bookings
  for select to authenticated using (auth.uid() in (renter_id, owner_id));
create policy bookings_insert on public.bookings
  for insert to authenticated with check (renter_id = auth.uid());
create policy bookings_update on public.bookings
  for update to authenticated
  using (auth.uid() in (renter_id, owner_id))
  with check (auth.uid() in (renter_id, owner_id));

-- Public availability: which dates are taken (no personal data exposed).
create or replace function public.booked_ranges(p_item_id uuid)
returns table (start_date date, end_date date)
language sql stable security definer set search_path = '' as $$
  select b.start_date, b.end_date
    from public.bookings b
   where b.item_id = p_item_id
     and b.status in ('approved', 'active')
     and b.end_date >= (now() at time zone 'Asia/Kolkata')::date
   order by b.start_date;
$$;
revoke all on function public.booked_ranges(uuid) from public, anon;
grant execute on function public.booked_ranges(uuid) to authenticated;
