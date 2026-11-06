-- SplitNest Phase 3 - custom split modes
--
-- Existing expenses stay on the 'equal' default. The new columns are additive,
-- and the old 8-argument create_expense function is left in place so a client
-- running the previous release keeps working while this migration rolls out.
--
-- Run this in the Supabase SQL editor after 0001, 0002, and 0003.

do $$
begin
  create type public.expense_split_mode as enum (
    'equal', 'amount', 'percentage', 'shares'
  );
exception when duplicate_object then null;
end $$;

alter table public.expenses
  add column if not exists split_mode public.expense_split_mode not null default 'equal';

alter table public.expense_splits
  add column if not exists split_value numeric(14, 4);

alter table public.expense_splits
  drop constraint if exists expense_splits_split_value_nonnegative;
alter table public.expense_splits
  add constraint expense_splits_split_value_nonnegative
  check (split_value is null or split_value >= 0);

-- ---------------------------------------------------------------------------
-- Create an expense and its splits atomically, now recording how the split
-- was entered. p_splits is a JSON array:
--   [{"user_id": "...", "share_paise": 1234, "split_value": 33.33}, ...]
--
-- share_paise remains the source of truth for balances in every mode.
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

  if not public.is_group_member(p_group_id) then
    raise exception 'not a member of this group';
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

-- Make the new columns and function visible to PostgREST immediately.
notify pgrst, 'reload schema';
