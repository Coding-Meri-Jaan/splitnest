-- SplitNest - expense comments, reactions, mentions, and notifications
--
-- Run this in the Supabase SQL editor after 0001 through 0005.
--
-- The discussion layer is deliberately expense-scoped:
--   * every comment belongs to one expense (and inherits its group)
--   * replies are one level deep so a thread stays readable on a phone
--   * reactions can target an expense or a single comment
--   * notifications are written by triggers, never by the browser
--
-- Nothing here changes existing expense, split, or settlement rows. The only
-- cross-cutting change is public.update_expense(), which edits an expense in
-- place so its discussion survives an edit instead of being cascaded away.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists public.expense_comments (
  id          uuid primary key default gen_random_uuid(),
  expense_id  uuid not null references public.expenses (id) on delete cascade,
  group_id    uuid not null references public.groups (id) on delete cascade,
  author_id   uuid not null references public.profiles (id),
  parent_id   uuid references public.expense_comments (id) on delete cascade,
  body        text not null,
  edited_at   timestamptz,
  created_at  timestamptz not null default now(),
  constraint expense_comments_body_length
    check (char_length(btrim(body)) between 1 and 2000)
);

create index if not exists expense_comments_expense_idx
  on public.expense_comments (expense_id, created_at);
create index if not exists expense_comments_parent_idx
  on public.expense_comments (parent_id);
create index if not exists expense_comments_group_idx
  on public.expense_comments (group_id);

create table if not exists public.expense_comment_mentions (
  comment_id        uuid not null references public.expense_comments (id) on delete cascade,
  mentioned_user_id uuid not null references public.profiles (id) on delete cascade,
  created_at        timestamptz not null default now(),
  primary key (comment_id, mentioned_user_id)
);

create index if not exists expense_comment_mentions_user_idx
  on public.expense_comment_mentions (mentioned_user_id);

create table if not exists public.expense_reactions (
  id         uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.expenses (id) on delete cascade,
  comment_id uuid references public.expense_comments (id) on delete cascade,
  group_id   uuid not null references public.groups (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  emoji      text not null
    check (emoji in ('👍', '❤️', '😂', '👀', '🙌', '😮')),
  created_at timestamptz not null default now()
);

-- One reaction per person per target. A null comment_id means the reaction is
-- on the expense itself.
create unique index if not exists expense_reactions_expense_unique
  on public.expense_reactions (expense_id, user_id)
  where comment_id is null;
create unique index if not exists expense_reactions_comment_unique
  on public.expense_reactions (comment_id, user_id)
  where comment_id is not null;
create index if not exists expense_reactions_expense_idx
  on public.expense_reactions (expense_id);
create index if not exists expense_reactions_comment_idx
  on public.expense_reactions (comment_id);

create table if not exists public.notification_preferences (
  user_id           uuid primary key references public.profiles (id) on delete cascade,
  expense_comments  boolean not null default true,
  comment_replies   boolean not null default true,
  mentions          boolean not null default true,
  reactions         boolean not null default true,
  updated_at        timestamptz not null default now()
);

drop trigger if exists notification_preferences_touch_updated_at
  on public.notification_preferences;
create trigger notification_preferences_touch_updated_at
  before update on public.notification_preferences
  for each row execute function public.touch_updated_at();

create table if not exists public.notifications (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles (id) on delete cascade,
  actor_id       uuid references public.profiles (id) on delete set null,
  type           text not null
    check (type in ('expense_comment', 'comment_reply', 'mention', 'expense_reaction')),
  group_id       uuid references public.groups (id) on delete cascade,
  group_name     text,
  expense_id     uuid references public.expenses (id) on delete cascade,
  expense_title  text,
  comment_id     uuid references public.expense_comments (id) on delete cascade,
  reaction_emoji text,
  dedupe_key     text not null unique,
  read_at        timestamptz,
  created_at     timestamptz not null default now()
);

create index if not exists notifications_user_idx
  on public.notifications (user_id, read_at, created_at desc);

-- ---------------------------------------------------------------------------
-- Validation triggers
--
-- The browser sends expense_id/group_id, but the database derives the group
-- from the expense. A request cannot attach a comment or reaction to a group
-- the expense does not belong to, even if it bypasses the app.
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
  v_parent_parent uuid;
begin
  select group_id into v_group_id
  from public.expenses
  where id = new.expense_id;

  if v_group_id is null then
    raise exception 'expense not found';
  end if;

  new.group_id := v_group_id;

  if new.parent_id is not null then
    select expense_id, parent_id
      into v_parent_expense, v_parent_parent
    from public.expense_comments
    where id = new.parent_id;

    if v_parent_expense is null or v_parent_expense <> new.expense_id then
      raise exception 'reply must belong to the same expense';
    end if;

    if v_parent_parent is not null then
      raise exception 'replies can only be one level deep';
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

drop trigger if exists expense_comments_validate on public.expense_comments;
create trigger expense_comments_validate
  before insert or update on public.expense_comments
  for each row execute function public.validate_expense_comment();

create or replace function public.validate_expense_reaction()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_group_id uuid;
begin
  select group_id into v_group_id
  from public.expenses
  where id = new.expense_id;

  if v_group_id is null then
    raise exception 'expense not found';
  end if;

  new.group_id := v_group_id;

  if new.comment_id is not null then
    if not exists (
      select 1
      from public.expense_comments c
      where c.id = new.comment_id
        and c.expense_id = new.expense_id
    ) then
      raise exception 'reaction comment does not belong to this expense';
    end if;
  end if;

  if tg_op = 'UPDATE' then
    if new.expense_id <> old.expense_id
      or new.comment_id is distinct from old.comment_id
      or new.user_id <> old.user_id then
      raise exception 'reaction target cannot be changed';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists expense_reactions_validate on public.expense_reactions;
create trigger expense_reactions_validate
  before insert or update on public.expense_reactions
  for each row execute function public.validate_expense_reaction();

-- ---------------------------------------------------------------------------
-- Notification writer
--
-- SECURITY DEFINER so the browser cannot forge notifications (the table has no
-- INSERT policy). The dedupe key keeps one notification per person per event,
-- and a later mention upgrades an existing comment/reply notification.
-- ---------------------------------------------------------------------------
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
      when 'expense_comment' then coalesce(np.expense_comments, true)
      when 'comment_reply'   then coalesce(np.comment_replies, true)
      when 'mention'         then coalesce(np.mentions, true)
      when 'expense_reaction' then coalesce(np.reactions, true)
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

-- Comment on an expense -> notify its creator.
-- Reply -> notify the parent author (a reply is more specific than the
-- generic "commented on your expense" notification, so it is written first).
create or replace function public.notify_expense_comment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_expense_creator uuid;
  v_parent_author uuid;
begin
  select created_by into v_expense_creator
  from public.expenses
  where id = new.expense_id;

  if new.parent_id is not null then
    select author_id into v_parent_author
    from public.expense_comments
    where id = new.parent_id;
  end if;

  if v_parent_author is not null then
    perform public.push_expense_notification(
      v_parent_author, new.author_id, 'comment_reply', new.group_id,
      new.expense_id, new.id, null,
      'comment:' || new.id::text || ':' || v_parent_author::text
    );
  end if;

  if v_expense_creator is not null then
    perform public.push_expense_notification(
      v_expense_creator, new.author_id, 'expense_comment', new.group_id,
      new.expense_id, new.id, null,
      'comment:' || new.id::text || ':' || v_expense_creator::text
    );
  end if;

  return new;
end;
$$;

drop trigger if exists expense_comments_notify on public.expense_comments;
create trigger expense_comments_notify
  after insert on public.expense_comments
  for each row execute function public.notify_expense_comment();

-- Mention rows are written by the app after it validates the @names against
-- the group roster. The trigger turns them into notifications.
create or replace function public.notify_comment_mention()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_author uuid;
  v_group_id uuid;
  v_expense_id uuid;
begin
  select author_id, group_id, expense_id
    into v_author, v_group_id, v_expense_id
  from public.expense_comments
  where id = new.comment_id;

  if v_author is null then
    return new;
  end if;

  perform public.push_expense_notification(
    new.mentioned_user_id, v_author, 'mention', v_group_id, v_expense_id,
    new.comment_id, null,
    'comment:' || new.comment_id::text || ':' || new.mentioned_user_id::text
  );

  return new;
end;
$$;

drop trigger if exists expense_comment_mentions_notify
  on public.expense_comment_mentions;
create trigger expense_comment_mentions_notify
  after insert on public.expense_comment_mentions
  for each row execute function public.notify_comment_mention();

-- A reaction on the expense itself notifies the creator. Reacting to a comment
-- stays quiet; the comment already had its own notification path.
create or replace function public.notify_expense_reaction()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_expense_creator uuid;
begin
  if new.comment_id is not null then
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

drop trigger if exists expense_reactions_notify on public.expense_reactions;
create trigger expense_reactions_notify
  after insert on public.expense_reactions
  for each row execute function public.notify_expense_reaction();

revoke all on function public.validate_expense_comment() from public;
revoke all on function public.validate_expense_reaction() from public;
revoke all on function public.notify_expense_comment() from public;
revoke all on function public.notify_comment_mention() from public;
revoke all on function public.notify_expense_reaction() from public;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.expense_comments         enable row level security;
alter table public.expense_comment_mentions enable row level security;
alter table public.expense_reactions        enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.notifications            enable row level security;

-- Comments: every member can read, write their own, and admins can moderate.
drop policy if exists "expense_comments_select_member" on public.expense_comments;
create policy "expense_comments_select_member" on public.expense_comments
  for select to authenticated
  using (public.is_group_member(group_id));

drop policy if exists "expense_comments_insert_self" on public.expense_comments;
create policy "expense_comments_insert_self" on public.expense_comments
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and public.is_group_member(group_id)
  );

drop policy if exists "expense_comments_update_author" on public.expense_comments;
create policy "expense_comments_update_author" on public.expense_comments
  for update to authenticated
  using (
    author_id = auth.uid()
    and public.is_group_member(group_id)
  )
  with check (
    author_id = auth.uid()
    and public.is_group_member(group_id)
  );

drop policy if exists "expense_comments_delete_author_or_admin" on public.expense_comments;
create policy "expense_comments_delete_author_or_admin" on public.expense_comments
  for delete to authenticated
  using (
    (author_id = auth.uid() and public.is_group_member(group_id))
    or public.is_group_admin(group_id)
  );

-- Mentions follow their parent comment and may only name current members.
drop policy if exists "expense_comment_mentions_select_member" on public.expense_comment_mentions;
create policy "expense_comment_mentions_select_member" on public.expense_comment_mentions
  for select to authenticated
  using (
    exists (
      select 1
      from public.expense_comments c
      where c.id = comment_id
        and public.is_group_member(c.group_id)
    )
  );

drop policy if exists "expense_comment_mentions_insert_author" on public.expense_comment_mentions;
create policy "expense_comment_mentions_insert_author" on public.expense_comment_mentions
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.expense_comments c
      join public.group_members gm on gm.group_id = c.group_id
      where c.id = comment_id
        and c.author_id = auth.uid()
        and gm.user_id = mentioned_user_id
    )
  );

drop policy if exists "expense_comment_mentions_delete_author" on public.expense_comment_mentions;
create policy "expense_comment_mentions_delete_author" on public.expense_comment_mentions
  for delete to authenticated
  using (
    exists (
      select 1
      from public.expense_comments c
      where c.id = comment_id and c.author_id = auth.uid()
    )
  );

-- Reactions: read by the group, written only by the person reacting.
drop policy if exists "expense_reactions_select_member" on public.expense_reactions;
create policy "expense_reactions_select_member" on public.expense_reactions
  for select to authenticated
  using (public.is_group_member(group_id));

drop policy if exists "expense_reactions_insert_self" on public.expense_reactions;
create policy "expense_reactions_insert_self" on public.expense_reactions
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.is_group_member(group_id)
  );

drop policy if exists "expense_reactions_update_self" on public.expense_reactions;
create policy "expense_reactions_update_self" on public.expense_reactions
  for update to authenticated
  using (
    user_id = auth.uid()
    and public.is_group_member(group_id)
  )
  with check (
    user_id = auth.uid()
    and public.is_group_member(group_id)
  );

drop policy if exists "expense_reactions_delete_self" on public.expense_reactions;
create policy "expense_reactions_delete_self" on public.expense_reactions
  for delete to authenticated
  using (
    user_id = auth.uid()
    and public.is_group_member(group_id)
  );

-- Preferences: strictly private.
drop policy if exists "notification_preferences_select_self" on public.notification_preferences;
create policy "notification_preferences_select_self" on public.notification_preferences
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "notification_preferences_insert_self" on public.notification_preferences;
create policy "notification_preferences_insert_self" on public.notification_preferences
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "notification_preferences_update_self" on public.notification_preferences;
create policy "notification_preferences_update_self" on public.notification_preferences
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Notifications: read and mark read only your own. There is intentionally no
-- INSERT policy; only the SECURITY DEFINER triggers can create them.
drop policy if exists "notifications_select_self" on public.notifications;
create policy "notifications_select_self" on public.notifications
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "notifications_update_self" on public.notifications;
create policy "notifications_update_self" on public.notifications
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "notifications_delete_self" on public.notifications;
create policy "notifications_delete_self" on public.notifications
  for delete to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on public.expense_comments to authenticated;
grant select, insert, delete on public.expense_comment_mentions to authenticated;
grant select, insert, update, delete on public.expense_reactions to authenticated;
grant select, insert, update on public.notification_preferences to authenticated;
grant select, update, delete on public.notifications to authenticated;

-- ---------------------------------------------------------------------------
-- update_expense: edit in place so the discussion survives an expense edit.
--
-- SECURITY DEFINER because a co-owner may edit an expense they did not create,
-- and the split-row policies only let the author rewrite splits. The explicit
-- permission check below is the authority.
-- ---------------------------------------------------------------------------
create or replace function public.update_expense(
  p_expense_id   uuid,
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
security definer
set search_path = ''
as $$
declare
  v_expense_group uuid;
  v_created_by uuid;
  v_sum bigint;
  v_value_sum numeric;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select group_id, created_by
    into v_expense_group, v_created_by
  from public.expenses
  where id = p_expense_id;

  if v_expense_group is null or v_expense_group <> p_group_id then
    raise exception 'expense not found';
  end if;

  if not (
    (v_created_by = auth.uid() and public.can_edit_group(p_group_id))
    or public.is_group_admin(p_group_id)
  ) then
    raise exception 'not allowed to edit expenses';
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

  update public.expenses
  set title = p_title,
      amount_paise = p_amount_paise,
      paid_by = p_paid_by,
      category = p_category,
      spent_at = p_spent_at,
      notes = p_notes,
      split_mode = p_split_mode
  where id = p_expense_id;

  delete from public.expense_splits where expense_id = p_expense_id;

  insert into public.expense_splits (
    expense_id, user_id, share_paise, split_value
  )
  select
    p_expense_id,
    (item ->> 'user_id')::uuid,
    (item ->> 'share_paise')::bigint,
    nullif(item ->> 'split_value', '')::numeric
  from jsonb_array_elements(p_splits) as item;

  return p_expense_id;
end;
$$;

revoke all on function public.update_expense(
  uuid, uuid, text, bigint, uuid, public.expense_category, date, text,
  public.expense_split_mode, jsonb
) from public;
grant execute on function public.update_expense(
  uuid, uuid, text, bigint, uuid, public.expense_category, date, text,
  public.expense_split_mode, jsonb
) to authenticated;

notify pgrst, 'reload schema';
