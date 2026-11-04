-- SplitNest Phase 2 - initial schema
-- Run this in the Supabase SQL editor (or via `supabase db push`).
-- All money is stored as integer paise (1 rupee = 100 paise).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.expense_category as enum (
    'food', 'travel', 'groceries', 'rent', 'utilities',
    'entertainment', 'shopping', 'other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.member_role as enum ('owner', 'member');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.settlement_method as enum ('upi', 'cash', 'bank_transfer', 'other');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text not null,
  full_name  text not null default '',
  city       text,
  upi_id     text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.groups (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(trim(name)) between 1 and 80),
  emoji      text not null default '🏠',
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists public.group_members (
  group_id  uuid not null references public.groups (id) on delete cascade,
  user_id   uuid not null references public.profiles (id) on delete cascade,
  role      public.member_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table if not exists public.expenses (
  id           uuid primary key default gen_random_uuid(),
  group_id     uuid not null references public.groups (id) on delete cascade,
  title        text not null check (char_length(trim(title)) between 1 and 120),
  amount_paise bigint not null check (amount_paise > 0),
  paid_by      uuid not null references public.profiles (id),
  category     public.expense_category not null default 'other',
  spent_at     date not null default current_date,
  notes        text,
  created_by   uuid not null references public.profiles (id),
  created_at   timestamptz not null default now()
);

create table if not exists public.expense_splits (
  expense_id  uuid not null references public.expenses (id) on delete cascade,
  user_id     uuid not null references public.profiles (id),
  share_paise bigint not null check (share_paise >= 0),
  primary key (expense_id, user_id)
);

create table if not exists public.settlements (
  id           uuid primary key default gen_random_uuid(),
  group_id     uuid not null references public.groups (id) on delete cascade,
  from_user    uuid not null references public.profiles (id),
  to_user      uuid not null references public.profiles (id),
  amount_paise bigint not null check (amount_paise > 0),
  method       public.settlement_method not null default 'upi',
  note         text,
  settled_at   date not null default current_date,
  created_by   uuid not null references public.profiles (id),
  created_at   timestamptz not null default now(),
  constraint settlement_parties_differ check (from_user <> to_user)
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
create index if not exists group_members_user_idx on public.group_members (user_id);
create index if not exists expenses_group_date_idx on public.expenses (group_id, spent_at desc);
create index if not exists expense_splits_user_idx on public.expense_splits (user_id);
create index if not exists settlements_group_date_idx on public.settlements (group_id, settled_at desc);

-- ---------------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER avoids recursive RLS lookups)
-- ---------------------------------------------------------------------------
create or replace function public.is_group_member(gid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.group_members
    where group_id = gid and user_id = auth.uid()
  );
$$;

create or replace function public.is_group_owner(gid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.group_members
    where group_id = gid and user_id = auth.uid() and role = 'owner'
  );
$$;

create or replace function public.shares_group_with(target_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.group_members me
    join public.group_members them on them.group_id = me.group_id
    where me.user_id = auth.uid() and them.user_id = target_user
  );
$$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
-- Every auth user gets a profile row.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Accounts created before this migration was applied still need a profile row.
insert into public.profiles (id, email, full_name)
select
  u.id,
  u.email,
  coalesce(nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''), split_part(u.email, '@', 1))
from auth.users u
where u.email is not null
on conflict (id) do nothing;

-- Creating a group makes the creator its owner.
create or replace function public.handle_new_group()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.group_members (group_id, user_id, role)
  values (new.id, new.created_by, 'owner')
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_group_created on public.groups;
create trigger on_group_created
  after insert on public.groups
  for each row execute function public.handle_new_group();

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles       enable row level security;
alter table public.groups         enable row level security;
alter table public.group_members  enable row level security;
alter table public.expenses       enable row level security;
alter table public.expense_splits enable row level security;
alter table public.settlements    enable row level security;

-- profiles: you can see yourself and people you share a group with.
drop policy if exists "profiles_select_self_or_group" on public.profiles;
create policy "profiles_select_self_or_group" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.shares_group_with(id));

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- groups: members can read, owners can change, anyone can create their own.
drop policy if exists "groups_select_member" on public.groups;
create policy "groups_select_member" on public.groups
  for select to authenticated
  using (public.is_group_member(id));

drop policy if exists "groups_insert_self" on public.groups;
create policy "groups_insert_self" on public.groups
  for insert to authenticated
  with check (created_by = auth.uid());

drop policy if exists "groups_update_owner" on public.groups;
create policy "groups_update_owner" on public.groups
  for update to authenticated
  using (public.is_group_owner(id))
  with check (public.is_group_owner(id));

drop policy if exists "groups_delete_owner" on public.groups;
create policy "groups_delete_owner" on public.groups
  for delete to authenticated
  using (public.is_group_owner(id));

-- group_members: members see the roster; owners add/remove; you may leave.
drop policy if exists "group_members_select_member" on public.group_members;
create policy "group_members_select_member" on public.group_members
  for select to authenticated
  using (public.is_group_member(group_id));

drop policy if exists "group_members_insert_owner" on public.group_members;
create policy "group_members_insert_owner" on public.group_members
  for insert to authenticated
  with check (public.is_group_owner(group_id));

drop policy if exists "group_members_delete_owner_or_self" on public.group_members;
create policy "group_members_delete_owner_or_self" on public.group_members
  for delete to authenticated
  using (public.is_group_owner(group_id) or user_id = auth.uid());

-- expenses: readable by the group, writable by its members.
drop policy if exists "expenses_select_member" on public.expenses;
create policy "expenses_select_member" on public.expenses
  for select to authenticated
  using (public.is_group_member(group_id));

drop policy if exists "expenses_insert_member" on public.expenses;
create policy "expenses_insert_member" on public.expenses
  for insert to authenticated
  with check (public.is_group_member(group_id) and created_by = auth.uid());

drop policy if exists "expenses_update_author_or_owner" on public.expenses;
create policy "expenses_update_author_or_owner" on public.expenses
  for update to authenticated
  using (created_by = auth.uid() or public.is_group_owner(group_id))
  with check (public.is_group_member(group_id));

drop policy if exists "expenses_delete_author_or_owner" on public.expenses;
create policy "expenses_delete_author_or_owner" on public.expenses
  for delete to authenticated
  using (created_by = auth.uid() or public.is_group_owner(group_id));

-- expense_splits: follow the parent expense's visibility.
drop policy if exists "expense_splits_select_member" on public.expense_splits;
create policy "expense_splits_select_member" on public.expense_splits
  for select to authenticated
  using (
    exists (
      select 1 from public.expenses e
      where e.id = expense_id and public.is_group_member(e.group_id)
    )
  );

drop policy if exists "expense_splits_write_author" on public.expense_splits;
create policy "expense_splits_write_author" on public.expense_splits
  for all to authenticated
  using (
    exists (
      select 1 from public.expenses e
      where e.id = expense_id and e.created_by = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.expenses e
      where e.id = expense_id and e.created_by = auth.uid() and public.is_group_member(e.group_id)
    )
  );

-- settlements: readable by the group, recorded by its members.
drop policy if exists "settlements_select_member" on public.settlements;
create policy "settlements_select_member" on public.settlements
  for select to authenticated
  using (public.is_group_member(group_id));

drop policy if exists "settlements_insert_member" on public.settlements;
create policy "settlements_insert_member" on public.settlements
  for insert to authenticated
  with check (public.is_group_member(group_id) and created_by = auth.uid());

drop policy if exists "settlements_delete_author_or_owner" on public.settlements;
create policy "settlements_delete_author_or_owner" on public.settlements
  for delete to authenticated
  using (created_by = auth.uid() or public.is_group_owner(group_id));

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------
revoke all on function public.is_group_member(uuid) from anon;
revoke all on function public.is_group_owner(uuid) from anon;
revoke all on function public.shares_group_with(uuid) from anon;
grant execute on function public.is_group_member(uuid) to authenticated;
grant execute on function public.is_group_owner(uuid) to authenticated;
grant execute on function public.shares_group_with(uuid) to authenticated;
