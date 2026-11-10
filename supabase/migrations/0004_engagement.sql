-- MODULE: engagement (Member D). Run fourth.
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id),
  owner_id uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (item_id, buyer_id),
  check (buyer_id <> owner_id)
);

alter table public.conversations enable row level security;
create policy conversations_read on public.conversations
  for select to authenticated using (auth.uid() in (buyer_id, owner_id));
create policy conversations_insert on public.conversations
  for insert to authenticated
  with check (
    buyer_id = auth.uid()
    and owner_id = (select i.owner_id from public.items i where i.id = item_id)
  );

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id),
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index messages_conv_idx on public.messages (conversation_id, created_at);

alter table public.messages enable row level security;
create policy messages_read on public.messages
  for select to authenticated
  using (exists (
    select 1 from public.conversations c
     where c.id = conversation_id and auth.uid() in (c.buyer_id, c.owner_id)));
create policy messages_insert on public.messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversations c
       where c.id = conversation_id and auth.uid() in (c.buyer_id, c.owner_id)));

-- Live chat: publish new messages to Realtime (Realtime still obeys the RLS above).
alter publication supabase_realtime add table public.messages;
