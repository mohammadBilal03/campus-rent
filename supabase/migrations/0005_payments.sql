
-- ==========================================
-- CAMPUS RENTAL: PAYMENT MODULE
-- Run after 0001, 0002, 0003 and 0004
-- ==========================================


-- 1. OWNER PAYMENT DETAILS
-- Each owner stores their UPI details once.

create table public.owner_payment_details (
    owner_id uuid primary key
        references public.profiles(id) on delete cascade,

    upi_id text not null
        check (
            char_length(trim(upi_id)) between 3 and 255
            and position('@' in upi_id) > 1
        ),

    upi_name text not null default '',

    upi_enabled boolean not null default true,

    updated_at timestamptz not null default now()
);

alter table public.owner_payment_details
enable row level security;

create policy owner_payment_details_read
on public.owner_payment_details
for select to authenticated
using (owner_id = auth.uid());

create policy owner_payment_details_insert
on public.owner_payment_details
for insert to authenticated
with check (owner_id = auth.uid());

create policy owner_payment_details_update
on public.owner_payment_details
for update to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

grant select, insert, update
on public.owner_payment_details
to authenticated;


-- 2. PAYMENTS TABLE

create table public.payments (
    id uuid primary key default gen_random_uuid(),

    booking_id uuid not null unique
        references public.bookings(id),

    renter_id uuid not null
        references public.profiles(id),

    owner_id uuid not null
        references public.profiles(id),

    payment_method text not null
        check (payment_method in ('upi', 'offline')),

    rent_amount_paise bigint not null
        check (rent_amount_paise >= 0),

    deposit_amount_paise bigint not null
        check (deposit_amount_paise >= 0),

    total_amount_paise bigint generated always as (
        rent_amount_paise + deposit_amount_paise
    ) stored,

    -- Snapshot: preserves the UPI details used for this booking.
    owner_upi_id_snapshot text,
    owner_upi_name_snapshot text,

    payment_status text not null default 'pending'
        check (
            payment_status in (
                'pending',
                'awaiting_confirmation',
                'paid'
            )
        ),

    confirmed_at timestamptz,
    confirmed_by uuid references public.profiles(id),

    created_at timestamptz not null default now()
);

create index payments_renter_idx
on public.payments(renter_id);

create index payments_owner_idx
on public.payments(owner_id);


-- 3. AUTOMATICALLY FILL PAYMENT DETAILS
-- Never trust the amount or owner ID sent by the browser.

create or replace function public.payments_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    b public.bookings%rowtype;
    owner_upi public.owner_payment_details%rowtype;
begin

    select *
    into b
    from public.bookings
    where id = new.booking_id;

    if not found then
        raise exception 'Booking not found';
    end if;

    if b.renter_id <> auth.uid() then
        raise exception 'You cannot pay for this booking';
    end if;

    if b.status <> 'approved' then
        raise exception 'Booking must be approved before payment';
    end if;

    -- Derive amounts from the trusted booking record.
    new.renter_id := b.renter_id;
    new.owner_id := b.owner_id;

    new.rent_amount_paise :=
        round(b.total_price * 100)::bigint;

    new.deposit_amount_paise :=
        round(b.deposit_snapshot * 100)::bigint;

    -- UPI details are needed only for online UPI payments.
    if new.payment_method = 'upi' then

        select *
        into owner_upi
        from public.owner_payment_details
        where owner_id = b.owner_id
          and upi_enabled = true;

        if not found then
            raise exception 'Owner has not enabled UPI payment';
        end if;

        new.owner_upi_id_snapshot := owner_upi.upi_id;
        new.owner_upi_name_snapshot := owner_upi.upi_name;

    else
        new.owner_upi_id_snapshot := null;
        new.owner_upi_name_snapshot := null;
    end if;

    -- The renter cannot set the payment status during creation.
    new.payment_status := 'pending';
    new.confirmed_at := null;
    new.confirmed_by := null;

    return new;
end;
$$;

create trigger payments_before_insert_trigger
before insert on public.payments
for each row
execute function public.payments_before_insert();


-- 4. RESTRICT PAYMENT STATUS CHANGES

create or replace function public.payments_enforce_transition()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
    uid uuid := auth.uid();
begin

    -- Payment details cannot be changed after creation.
    if (
        new.booking_id,
        new.renter_id,
        new.owner_id,
        new.payment_method,
        new.rent_amount_paise,
        new.deposit_amount_paise,
        new.owner_upi_id_snapshot,
        new.owner_upi_name_snapshot
    ) is distinct from (
        old.booking_id,
        old.renter_id,
        old.owner_id,
        old.payment_method,
        old.rent_amount_paise,
        old.deposit_amount_paise,
        old.owner_upi_id_snapshot,
        old.owner_upi_name_snapshot
    ) then
        raise exception 'Payment details cannot be changed';
    end if;

    if new.payment_status = old.payment_status then
        return new;
    end if;

    -- Renter says they have completed the payment.
    if uid = old.renter_id
       and old.payment_status = 'pending'
       and new.payment_status = 'awaiting_confirmation'
    then
        new.confirmed_at := null;
        new.confirmed_by := null;
        return new;
    end if;

    -- Only the owner can confirm receiving the money.
    if uid = old.owner_id
       and old.payment_status = 'awaiting_confirmation'
       and new.payment_status = 'paid'
    then
        new.confirmed_at := now();
        new.confirmed_by := uid;
        return new;
    end if;

    raise exception 'This payment status change is not allowed';
end;
$$;

create trigger payments_enforce_transition_trigger
before update on public.payments
for each row
execute function public.payments_enforce_transition();


-- 5. PAYMENT TABLE SECURITY

alter table public.payments enable row level security;

create policy payments_read
on public.payments
for select to authenticated
using (
    auth.uid() in (renter_id, owner_id)
);

create policy payments_insert
on public.payments
for insert to authenticated
with check (renter_id = auth.uid());

create policy payments_update
on public.payments
for update to authenticated
using (
    auth.uid() in (renter_id, owner_id)
)
with check (
    auth.uid() in (renter_id, owner_id)
);

grant select, insert, update
on public.payments
to authenticated;


-- 6. PREVENT ITEM HANDOVER BEFORE PAYMENT

create or replace function public.require_paid_before_activation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin

    if new.status = 'active'
       and old.status = 'approved'
       and not exists (
           select 1
           from public.payments p
           where p.booking_id = new.id
             and p.payment_status = 'paid'
       )
    then
        raise exception 'Payment must be confirmed before item handover';
    end if;

    return new;
end;
$$;

create trigger bookings_payment_before_activation
before update on public.bookings
for each row
execute function public.require_paid_before_activation();
-- Refresh Supabase API schema cache
NOTIFY pgrst, 'reload schema';