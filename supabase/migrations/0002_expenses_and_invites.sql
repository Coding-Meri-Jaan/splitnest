-- SplitNest Phase 2 - helpers for invites and atomic expense creation

-- ---------------------------------------------------------------------------
-- Look up a user to add to a group. Only the group's owner may call it, so
-- the profiles table can stay locked down to people you already share a
-- group with.
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
  where public.is_group_owner(gid)
    and lower(p.email) = lower(trim(lookup_email))
  limit 1;
$$;

revoke all on function public.find_user_for_invite(uuid, text) from public;
grant execute on function public.find_user_for_invite(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Create an expense and its splits atomically.
--
-- p_splits is a JSON array: [{"user_id": "...", "share_paise": 1234}, ...]
-- The function runs as the caller (security invoker), so RLS still applies.
-- ---------------------------------------------------------------------------
create or replace function public.create_expense(
  p_group_id     uuid,
  p_title        text,
  p_amount_paise bigint,
  p_paid_by      uuid,
  p_category     public.expense_category,
  p_spent_at     date,
  p_notes        text,
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
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if not public.is_group_member(p_group_id) then
    raise exception 'not a member of this group';
  end if;

  if p_amount_paise is null or p_amount_paise <= 0 then
    raise exception 'amount must be positive';
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
  select coalesce(sum((item ->> 'share_paise')::bigint), 0)
    into v_sum
    from jsonb_array_elements(p_splits) as item;

  if v_sum <> p_amount_paise then
    raise exception 'splits must add up to the expense amount';
  end if;

  insert into public.expenses (
    group_id, title, amount_paise, paid_by, category, spent_at, notes, created_by
  )
  values (
    p_group_id, p_title, p_amount_paise, p_paid_by, p_category, p_spent_at, p_notes, auth.uid()
  )
  returning id into v_expense_id;

  insert into public.expense_splits (expense_id, user_id, share_paise)
  select v_expense_id, (item ->> 'user_id')::uuid, (item ->> 'share_paise')::bigint
  from jsonb_array_elements(p_splits) as item;

  return v_expense_id;
end;
$$;

revoke all on function public.create_expense(
  uuid, text, bigint, uuid, public.expense_category, date, text, jsonb
) from public;
grant execute on function public.create_expense(
  uuid, text, bigint, uuid, public.expense_category, date, text, jsonb
) to authenticated;
