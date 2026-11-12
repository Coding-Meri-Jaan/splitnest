-- SplitNest - four group roles
--
-- owner     full control, including deleting the group and changing roles
-- co_owner  rename the group, manage members, edit any expense/settlement
-- editor    add expenses and settlements, edit the ones they add
-- viewer    read only (the default for new invites)
--
-- Run this in the Supabase SQL editor after 0001, 0002, 0003, and 0004.
--
-- Existing `member` rows are backfilled to `editor`, because `member` behaved
-- exactly like today's editor. Nobody loses write access.

-- ---------------------------------------------------------------------------
-- Replace the enum in one transaction-safe step.
-- ---------------------------------------------------------------------------

-- If an earlier attempt stopped before the swap finished, remove the scratch
-- type only when the role column is not using it yet. This makes the migration
-- safe to re-run after a partial failure.
do $$
declare
  v_scratch oid;
  v_role_type oid;
begin
  select t.oid into v_scratch
  from pg_type t
  join pg_namespace n on n.oid = t.typnamespace
  where n.nspname = 'public' and t.typname = 'member_role_new';

  select atttypid into v_role_type
  from pg_attribute
  where attrelid = 'public.group_members'::regclass
    and attname = 'role'
    and not attisdropped;

  if v_scratch is not null and v_role_type is distinct from v_scratch then
    drop type public.member_role_new;
  end if;
end $$;

do $$ begin
  create type public.member_role_new as enum ('owner', 'co_owner', 'editor', 'viewer');
exception when duplicate_object then null; end $$;

alter table public.group_members alter column role drop default;

alter table public.group_members
  alter column role type public.member_role_new
  using (
    case role::text
      when 'member' then 'editor'
      else role::text
    end
  )::public.member_role_new;

alter table public.group_members alter column role set default 'viewer';

-- group_role() returns member_role, so it must go before the type it uses.
drop function if exists public.group_role(uuid);
drop type if exists public.member_role;
-- RENAME TO takes an unqualified name; the type keeps the `public` schema.
alter type public.member_role_new rename to member_role;

-- ---------------------------------------------------------------------------
-- Role helpers (SECURITY DEFINER avoids recursive RLS lookups)
-- ---------------------------------------------------------------------------
create or replace function public.group_role(gid uuid)
returns public.member_role
language sql
stable
security definer
set search_path = ''
as $$
  select role
  from public.group_members
  where group_id = gid and user_id = auth.uid()
  limit 1;
$$;

-- Owner or co-owner: can rename the group and manage its people.
create or replace function public.is_group_admin(gid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.group_members
    where group_id = gid
      and user_id = auth.uid()
      and role in ('owner', 'co_owner')
  );
$$;

-- Owner, co-owner, or editor: can create ledger rows.
create or replace function public.can_edit_group(gid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.group_members
    where group_id = gid
      and user_id = auth.uid()
      and role in ('owner', 'co_owner', 'editor')
  );
$$;

revoke all on function public.group_role(uuid) from public;
revoke all on function public.is_group_admin(uuid) from public;
revoke all on function public.can_edit_group(uuid) from public;
grant execute on function public.group_role(uuid) to authenticated;
grant execute on function public.is_group_admin(uuid) to authenticated;
grant execute on function public.can_edit_group(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Invite lookup: owners and co-owners may look people up.
-- ---------------------------------------------------------------------------
create or replace function public.find_user_for_invite(gid uuid, lookup_email text)
returns table (id uuid, full_name text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.full_name
  from public.profiles p
  where public.is_group_admin(gid)
    and lower(p.email) = lower(trim(lookup_email))
  limit 1;
$$;

revoke all on function public.find_user_for_invite(uuid, text) from public;
grant execute on function public.find_user_for_invite(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

-- groups: everyone reads, admins rename, only the owner deletes.
drop policy if exists "groups_update_owner" on public.groups;
drop policy if exists "groups_update_admin" on public.groups;
create policy "groups_update_admin" on public.groups
  for update to authenticated
  using (public.is_group_admin(id))
  with check (public.is_group_admin(id));

drop policy if exists "groups_delete_owner" on public.groups;
create policy "groups_delete_owner" on public.groups
  for delete to authenticated
  using (public.is_group_owner(id));

-- group_members: admins add people; only the owner changes roles.
drop policy if exists "group_members_insert_owner" on public.group_members;
drop policy if exists "group_members_insert_admin" on public.group_members;
create policy "group_members_insert_admin" on public.group_members
  for insert to authenticated
  with check (
    role <> 'owner'
    and (
      public.is_group_owner(group_id)
      or (public.is_group_admin(group_id) and role in ('editor', 'viewer'))
    )
  );

drop policy if exists "group_members_update_owner" on public.group_members;
create policy "group_members_update_owner" on public.group_members
  for update to authenticated
  using (public.is_group_owner(group_id))
  with check (
    public.is_group_owner(group_id)
    and role in ('co_owner', 'editor', 'viewer')
  );

drop policy if exists "group_members_delete_owner_or_self" on public.group_members;
drop policy if exists "group_members_delete_admin_or_self" on public.group_members;
create policy "group_members_delete_admin_or_self" on public.group_members
  for delete to authenticated
  using (
    (user_id = auth.uid() and role <> 'owner')
    or (
      user_id <> auth.uid()
      and (
        public.is_group_owner(group_id)
        or (public.is_group_admin(group_id) and role in ('editor', 'viewer'))
      )
    )
  );

-- expenses: viewers read; editors write their own rows; admins manage all.
drop policy if exists "expenses_insert_member" on public.expenses;
drop policy if exists "expenses_insert_editor" on public.expenses;
create policy "expenses_insert_editor" on public.expenses
  for insert to authenticated
  with check (public.can_edit_group(group_id) and created_by = auth.uid());

drop policy if exists "expenses_update_author_or_owner" on public.expenses;
drop policy if exists "expenses_update_author_or_admin" on public.expenses;
create policy "expenses_update_author_or_admin" on public.expenses
  for update to authenticated
  using (
    (created_by = auth.uid() and public.can_edit_group(group_id))
    or public.is_group_admin(group_id)
  )
  with check (public.can_edit_group(group_id));

drop policy if exists "expenses_delete_author_or_owner" on public.expenses;
drop policy if exists "expenses_delete_author_or_admin" on public.expenses;
create policy "expenses_delete_author_or_admin" on public.expenses
  for delete to authenticated
  using (
    (created_by = auth.uid() and public.can_edit_group(group_id))
    or public.is_group_admin(group_id)
  );

-- expense_splits: follow the parent expense and the editor rule.
drop policy if exists "expense_splits_write_author" on public.expense_splits;
create policy "expense_splits_write_author" on public.expense_splits
  for all to authenticated
  using (
    exists (
      select 1 from public.expenses e
      where e.id = expense_id
        and e.created_by = auth.uid()
        and public.can_edit_group(e.group_id)
    )
  )
  with check (
    exists (
      select 1 from public.expenses e
      where e.id = expense_id
        and e.created_by = auth.uid()
        and public.can_edit_group(e.group_id)
    )
  );

-- settlements: viewers read; editors record; admins can remove any row.
drop policy if exists "settlements_insert_member" on public.settlements;
drop policy if exists "settlements_insert_editor" on public.settlements;
create policy "settlements_insert_editor" on public.settlements
  for insert to authenticated
  with check (public.can_edit_group(group_id) and created_by = auth.uid());

drop policy if exists "settlements_delete_author_or_owner" on public.settlements;
drop policy if exists "settlements_delete_author_or_admin" on public.settlements;
create policy "settlements_delete_author_or_admin" on public.settlements
  for delete to authenticated
  using (
    (created_by = auth.uid() and public.can_edit_group(group_id))
    or public.is_group_admin(group_id)
  );

-- ---------------------------------------------------------------------------
-- create_expense: viewers may no longer create ledger rows.
-- ---------------------------------------------------------------------------
create or replace function public.create_expense(
  p_group_id     uuid,
  p_title        text,
  p_amount_paise bigint,
  p_paid_by      uuid,
  p_category     public.expense_category,
  p_spent_at     date,
  p_notes        text,
  p_split_mode   public.expense_split_mode,
  p_splits       jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_expense_id uuid;
  v_sum bigint;
  v_value_sum numeric;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if not public.can_edit_group(p_group_id) then
    raise exception 'not allowed to add expenses';
  end if;

  if p_amount_paise is null or p_amount_paise <= 0 then
    raise exception 'amount must be positive';
  end if;

  if p_split_mode is null then
    raise exception 'split mode is required';
  end if;

  if not exists (
    select 1 from public.group_members
    where group_id = p_group_id and user_id = p_paid_by
  ) then
    raise exception 'payer is not a member of this group';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_splits) as item
    left join public.group_members gm
      on gm.group_id = p_group_id
     and gm.user_id = (item ->> 'user_id')::uuid
    where gm.user_id is null
  ) then
    raise exception 'a split member is not in this group';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_splits) as item
    where item ->> 'split_value' is not null
      and (item ->> 'split_value')::numeric < 0
  ) then
    raise exception 'split values cannot be negative';
  end if;

  select coalesce(sum((item ->> 'share_paise')::bigint), 0)
    into v_sum
    from jsonb_array_elements(p_splits) as item;

  if v_sum <> p_amount_paise then
    raise exception 'splits must add up to the expense amount';
  end if;

  if p_split_mode = 'percentage' then
    select coalesce(sum((item ->> 'split_value')::numeric), 0)
      into v_value_sum
      from jsonb_array_elements(p_splits) as item;

    if v_value_sum <> 100 then
      raise exception 'percentages must add up to 100';
    end if;
  elsif p_split_mode = 'shares' then
    select coalesce(sum((item ->> 'split_value')::numeric), 0)
      into v_value_sum
      from jsonb_array_elements(p_splits) as item;

    if v_value_sum <= 0 then
      raise exception 'shares must be positive';
    end if;
  end if;

  insert into public.expenses (
    group_id, title, amount_paise, paid_by, category, spent_at, notes,
    created_by, split_mode
  )
  values (
    p_group_id, p_title, p_amount_paise, p_paid_by, p_category, p_spent_at,
    p_notes, auth.uid(), p_split_mode
  )
  returning id into v_expense_id;

  insert into public.expense_splits (
    expense_id, user_id, share_paise, split_value
  )
  select
    v_expense_id,
    (item ->> 'user_id')::uuid,
    (item ->> 'share_paise')::bigint,
    nullif(item ->> 'split_value', '')::numeric
  from jsonb_array_elements(p_splits) as item;

  return v_expense_id;
end;
$$;

revoke all on function public.create_expense(
  uuid, text, bigint, uuid, public.expense_category, date, text,
  public.expense_split_mode, jsonb
) from public;
grant execute on function public.create_expense(
  uuid, text, bigint, uuid, public.expense_category, date, text,
  public.expense_split_mode, jsonb
) to authenticated;

notify pgrst, 'reload schema';
