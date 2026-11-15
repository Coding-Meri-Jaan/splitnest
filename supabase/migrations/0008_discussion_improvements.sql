-- SplitNest - discussion improvements
--
-- Run this in the Supabase SQL editor after 0007_group_polls.sql.
--
-- This migration only changes the discussion layer:
--   * replies can nest to any depth (the UI caps the visual indent)
--   * reactions accept any single emoji, not a fixed list of six
--   * reacting to a comment notifies the person who wrote it
--
-- It is safe to run more than once. Existing comments, reactions, expenses,
-- splits, and settlements are left untouched.

-- ---------------------------------------------------------------------------
-- Unlimited reply depth
--
-- The old trigger stopped a reply to a reply. The parent must still belong to
-- the same expense, and a comment can never be moved to a different parent,
-- so the tree cannot develop a loop.
-- ---------------------------------------------------------------------------
create or replace function public.validate_expense_comment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_group_id uuid;
  v_parent_expense uuid;
begin
  select group_id into v_group_id
  from public.expenses
  where id = new.expense_id;

  if v_group_id is null then
    raise exception 'expense not found';
  end if;

  new.group_id := v_group_id;

  if new.parent_id is not null then
    select expense_id
      into v_parent_expense
    from public.expense_comments
    where id = new.parent_id;

    if v_parent_expense is null or v_parent_expense <> new.expense_id then
      raise exception 'reply must belong to the same expense';
    end if;
  end if;

  if tg_op = 'UPDATE' then
    if new.expense_id <> old.expense_id
      or new.group_id <> old.group_id
      or new.author_id <> old.author_id
      or new.parent_id is distinct from old.parent_id then
      raise exception 'comment target cannot be changed';
    end if;

    if new.body is distinct from old.body then
      new.edited_at := now();
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.validate_expense_comment() from public;

-- ---------------------------------------------------------------------------
-- Any single emoji is a valid reaction
--
-- The app validates one grapheme cluster with Intl.Segmenter. PostgreSQL does
-- not expose Unicode property escapes, so this constraint is the structural
-- safety net: no ASCII text and no long payloads. The first code point must be
-- in the symbol/emoji ranges (U+2600 through U+1FAFF).
-- ---------------------------------------------------------------------------
alter table public.expense_reactions
  drop constraint if exists expense_reactions_emoji_check;

alter table public.expense_reactions
  add constraint expense_reactions_emoji_check
  check (
    char_length(emoji) between 1 and 16
    and ascii(emoji) between 9728 and 129791
  );

-- ---------------------------------------------------------------------------
-- Notification kinds and preferences
--
-- Keep the poll kinds from 0007 so this file remains safe regardless of which
-- migration ran most recently.
-- ---------------------------------------------------------------------------
do $$
declare
  v_name text;
begin
  for v_name in
    select conname
    from pg_constraint
    where conrelid = 'public.notifications'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%expense_comment%'
  loop
    execute format('alter table public.notifications drop constraint %I', v_name);
  end loop;
end $$;

alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check
  check (
    type in (
      'expense_comment',
      'comment_reply',
      'mention',
      'expense_reaction',
      'comment_reaction',
      'poll_created',
      'poll_deadline',
      'poll_closed',
      'poll_cancelled'
    )
  );

-- Comment reactions share the existing "reactions" preference toggle. The
-- function is recreated only to add that one mapping.
create or replace function public.push_expense_notification(
  p_user_id    uuid,
  p_actor_id   uuid,
  p_type       text,
  p_group_id   uuid,
  p_expense_id uuid,
  p_comment_id uuid,
  p_emoji      text,
  p_dedupe_key text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_enabled boolean;
  v_group_name text;
  v_expense_title text;
begin
  if p_user_id is null or p_user_id = p_actor_id then
    return;
  end if;

  -- A notification is only useful while the recipient can still open the
  -- expense. Leaving a group stops new notifications without deleting history.
  if not exists (
    select 1
    from public.group_members
    where group_id = p_group_id and user_id = p_user_id
  ) then
    return;
  end if;

  select
    case p_type
      when 'expense_comment'    then coalesce(np.expense_comments, true)
      when 'comment_reply'      then coalesce(np.comment_replies, true)
      when 'mention'            then coalesce(np.mentions, true)
      when 'expense_reaction'   then coalesce(np.reactions, true)
      when 'comment_reaction'   then coalesce(np.reactions, true)
      else false
    end
  into v_enabled
  from (select 1) dummy
  left join public.notification_preferences np on np.user_id = p_user_id;

  if not coalesce(v_enabled, true) then
    return;
  end if;

  select g.name, e.title
    into v_group_name, v_expense_title
  from public.expenses e
  join public.groups g on g.id = e.group_id
  where e.id = p_expense_id;

  insert into public.notifications (
    user_id, actor_id, type, group_id, group_name, expense_id, expense_title,
    comment_id, reaction_emoji, dedupe_key
  )
  values (
    p_user_id, p_actor_id, p_type, p_group_id, v_group_name, p_expense_id,
    v_expense_title, p_comment_id, p_emoji, p_dedupe_key
  )
  on conflict (dedupe_key) do update
    set type = excluded.type,
        actor_id = excluded.actor_id,
        comment_id = excluded.comment_id,
        reaction_emoji = excluded.reaction_emoji,
        created_at = now(),
        read_at = null
    where excluded.type = 'mention'
      and public.notifications.type <> 'mention';
end;
$$;

revoke all on function public.push_expense_notification(
  uuid, uuid, text, uuid, uuid, uuid, text, text
) from public;

-- Expense reactions still notify the creator. Comment reactions now notify
-- the comment author. Only inserts notify: changing an existing reaction is a
-- deliberate edit, not a new event, so it does not ping the author twice.
create or replace function public.notify_expense_reaction()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_expense_creator uuid;
  v_comment_author uuid;
begin
  if new.comment_id is not null then
    select author_id into v_comment_author
    from public.expense_comments
    where id = new.comment_id;

    if v_comment_author is not null then
      perform public.push_expense_notification(
        v_comment_author, new.user_id, 'comment_reaction', new.group_id,
        new.expense_id, new.comment_id, new.emoji,
        'comment_reaction:' || new.comment_id::text || ':' ||
          new.user_id::text || ':' || new.emoji
      );
    end if;

    return new;
  end if;

  select created_by into v_expense_creator
  from public.expenses
  where id = new.expense_id;

  if v_expense_creator is not null then
    perform public.push_expense_notification(
      v_expense_creator, new.user_id, 'expense_reaction', new.group_id,
      new.expense_id, null, new.emoji,
      'reaction:' || new.expense_id::text || ':' || new.user_id::text
    );
  end if;

  return new;
end;
$$;

revoke all on function public.notify_expense_reaction() from public;
