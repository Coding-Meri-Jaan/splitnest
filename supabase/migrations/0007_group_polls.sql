-- SplitNest - group polls and voting
--
-- Run this in the Supabase SQL editor after 0001 through 0006.
--
-- A poll is deliberately group-scoped, not expense-scoped: it answers the
-- questions a shared ledger cannot ("where should we eat?", "which hotel?").
--   * every poll belongs to one group and inherits that group's members
--   * voting is restricted to current members
--   * deadlines are enforced by the database clock, never the browser
--   * vote rows are written only by SECURITY DEFINER functions, so a client
--     cannot stuff the ballot box or bypass a single-choice rule
--   * anonymous polls hide voter identities from everyone, including the
--     creator; only aggregate counts are exposed through poll_results()
--
-- Existing expenses, discussions, splits, and settlements are untouched.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.poll_status as enum ('open', 'closed', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.poll_selection as enum ('single', 'multiple');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.poll_results_visibility as enum ('always', 'after_vote', 'after_close');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists public.polls (
  id                         uuid primary key default gen_random_uuid(),
  group_id                   uuid not null references public.groups (id) on delete cascade,
  created_by                 uuid not null references public.profiles (id) on delete cascade,
  title                      text not null,
  description                text,
  status                     public.poll_status not null default 'open',
  selection                  public.poll_selection not null default 'single',
  results_visibility         public.poll_results_visibility not null default 'after_vote',
  is_anonymous               boolean not null default false,
  closes_at                  timestamptz not null,
  closed_at                  timestamptz,
  cancelled_at               timestamptz,
  deadline_reminder_sent_at  timestamptz,
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now(),
  constraint polls_title_length
    check (char_length(btrim(title)) between 3 and 140),
  constraint polls_description_length
    check (description is null or char_length(description) <= 2000)
);

create index if not exists polls_group_status_idx
  on public.polls (group_id, status, closes_at);
create index if not exists polls_creator_idx
  on public.polls (created_by);

drop trigger if exists polls_touch_updated_at on public.polls;
create trigger polls_touch_updated_at
  before update on public.polls
  for each row execute function public.touch_updated_at();

create table if not exists public.poll_options (
  id          uuid primary key default gen_random_uuid(),
  poll_id     uuid not null references public.polls (id) on delete cascade,
  label       text not null,
  image_url   text,
  position    integer not null default 0,
  created_at  timestamptz not null default now(),
  constraint poll_options_label_length
    check (char_length(btrim(label)) between 1 and 120),
  constraint poll_options_image_url
    check (image_url is null or image_url ~* '^https?://[^[:space:]]+$'),
  constraint poll_options_position
    check (position >= 0)
);

create index if not exists poll_options_poll_idx
  on public.poll_options (poll_id, position, created_at);
create unique index if not exists poll_options_label_unique
  on public.poll_options (poll_id, lower(btrim(label)));

create table if not exists public.poll_votes (
  id          uuid primary key default gen_random_uuid(),
  poll_id     uuid not null references public.polls (id) on delete cascade,
  option_id   uuid not null references public.poll_options (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  constraint poll_votes_unique_option unique (poll_id, option_id, user_id)
);

create index if not exists poll_votes_poll_idx
  on public.poll_votes (poll_id);
create index if not exists poll_votes_user_idx
  on public.poll_votes (poll_id, user_id);

-- ---------------------------------------------------------------------------
-- Validation: a vote must target an option of its own poll, while the poll is
-- still open, and single-choice polls accept one option per person.
-- ---------------------------------------------------------------------------
create or replace function public.validate_poll_vote()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_poll_id     uuid;
  v_status      public.poll_status;
  v_selection   public.poll_selection;
  v_closes_at   timestamptz;
begin
  select poll_id into v_poll_id
  from public.poll_options
  where id = new.option_id;

  if v_poll_id is null then
    raise exception 'poll option not found';
  end if;

  -- Derive the poll from the option so a mismatched pair can never be stored.
  new.poll_id := v_poll_id;

  select status, selection, closes_at
    into v_status, v_selection, v_closes_at
  from public.polls
  where id = v_poll_id;

  if v_status is null then
    raise exception 'poll not found';
  end if;

  if v_status <> 'open' then
    raise exception 'this poll is no longer open';
  end if;

  if v_closes_at <= now() then
    raise exception 'the voting deadline has passed';
  end if;

  if v_selection = 'single' and exists (
    select 1
    from public.poll_votes
    where poll_id = new.poll_id
      and user_id = new.user_id
      and option_id <> new.option_id
      and (new.id is null or id <> new.id)
  ) then
    raise exception 'this poll only allows one choice';
  end if;

  if tg_op = 'UPDATE' then
    if new.poll_id <> old.poll_id
      or new.user_id <> old.user_id
      or new.option_id <> old.option_id then
      raise exception 'a vote cannot be moved to another poll, member, or option';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists poll_votes_validate on public.poll_votes;
create trigger poll_votes_validate
  before insert or update on public.poll_votes
  for each row execute function public.validate_poll_vote();

revoke all on function public.validate_poll_vote() from public;

-- ---------------------------------------------------------------------------
-- Notification extensions
-- ---------------------------------------------------------------------------
alter table public.notifications
  add column if not exists poll_id uuid references public.polls (id) on delete cascade;
alter table public.notifications
  add column if not exists poll_title text;

create index if not exists notifications_poll_idx
  on public.notifications (poll_id);

alter table public.notification_preferences
  add column if not exists poll_updates boolean not null default true;

-- The original type check only knew about expense discussion events. Replace
-- whatever it was named with the extended list.
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
      'poll_created',
      'poll_deadline',
      'poll_closed',
      'poll_cancelled'
    )
  );

-- ---------------------------------------------------------------------------
-- Notification writer
--
-- SECURITY DEFINER so the browser cannot forge a notification (the table has
-- no INSERT policy). Poll updates share one preference toggle; leaving the
-- group stops new notifications without deleting history.
-- ---------------------------------------------------------------------------
create or replace function public.push_poll_notification(
  p_user_id    uuid,
  p_actor_id   uuid,
  p_type       text,
  p_poll_id    uuid,
  p_dedupe_key text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_enabled    boolean;
  v_group_id   uuid;
  v_group_name text;
  v_poll_title text;
begin
  if p_user_id is null or p_user_id = p_actor_id then
    return;
  end if;

  select p.group_id, p.title, g.name
    into v_group_id, v_poll_title, v_group_name
  from public.polls p
  join public.groups g on g.id = p.group_id
  where p.id = p_poll_id;

  if v_group_id is null then
    return;
  end if;

  if not exists (
    select 1
    from public.group_members
    where group_id = v_group_id and user_id = p_user_id
  ) then
    return;
  end if;

  select coalesce(np.poll_updates, true)
    into v_enabled
  from (select 1) dummy
  left join public.notification_preferences np on np.user_id = p_user_id;

  if not coalesce(v_enabled, true) then
    return;
  end if;

  insert into public.notifications (
    user_id, actor_id, type, group_id, group_name, poll_id, poll_title,
    dedupe_key
  )
  values (
    p_user_id, p_actor_id, p_type, v_group_id, v_group_name, p_poll_id,
    v_poll_title, p_dedupe_key
  )
  on conflict (dedupe_key) do nothing;
end;
$$;

revoke all on function public.push_poll_notification(uuid, uuid, text, uuid, text)
  from public;

-- New poll -> every current member except its creator.
create or replace function public.notify_poll_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member uuid;
begin
  for v_member in
    select user_id
    from public.group_members
    where group_id = new.group_id
      and user_id <> new.created_by
  loop
    perform public.push_poll_notification(
      v_member,
      new.created_by,
      'poll_created',
      new.id,
      'poll-created:' || new.id::text || ':' || v_member::text
    );
  end loop;

  return new;
end;
$$;

drop trigger if exists polls_notify_created on public.polls;
create trigger polls_notify_created
  after insert on public.polls
  for each row execute function public.notify_poll_created();

-- Closing or cancelling a poll -> every member. The closed notification also
-- signals that the final results are ready.
create or replace function public.notify_poll_status_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_kind   text;
  v_member uuid;
begin
  if old.status = new.status or new.status = 'open' then
    return new;
  end if;

  v_kind := case new.status
    when 'closed' then 'poll_closed'
    when 'cancelled' then 'poll_cancelled'
    else null
  end;

  if v_kind is null then
    return new;
  end if;

  for v_member in
    select user_id
    from public.group_members
    where group_id = new.group_id
  loop
    perform public.push_poll_notification(
      v_member,
      new.created_by,
      v_kind,
      new.id,
      'poll-status:' || new.id::text || ':' || new.status::text || ':' || v_member::text
    );
  end loop;

  return new;
end;
$$;

drop trigger if exists polls_notify_status on public.polls;
create trigger polls_notify_status
  after update of status on public.polls
  for each row execute function public.notify_poll_status_change();

revoke all on function public.notify_poll_created() from public;
revoke all on function public.notify_poll_status_change() from public;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.polls        enable row level security;
alter table public.poll_options enable row level security;
alter table public.poll_votes   enable row level security;

drop policy if exists "polls_select_member" on public.polls;
create policy "polls_select_member" on public.polls
  for select to authenticated
  using (public.is_group_member(group_id));

drop policy if exists "poll_options_select_member" on public.poll_options;
create policy "poll_options_select_member" on public.poll_options
  for select to authenticated
  using (
    exists (
      select 1
      from public.polls p
      where p.id = poll_id
        and public.is_group_member(p.group_id)
    )
  );

-- A member can read only their own vote rows. Aggregate results come from
-- poll_results(), so an anonymous poll never leaks who voted for what.
drop policy if exists "poll_votes_select_self" on public.poll_votes;
create policy "poll_votes_select_self" on public.poll_votes
  for select to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Privileges: reads only. Writes happen through the functions below.
-- ---------------------------------------------------------------------------
grant select on public.polls to authenticated;
grant select on public.poll_options to authenticated;
grant select on public.poll_votes to authenticated;

-- ---------------------------------------------------------------------------
-- Validation helper shared by create and edit.
-- ---------------------------------------------------------------------------
create or replace function public.validate_poll_draft(
  p_title       text,
  p_description text,
  p_closes_at   timestamptz,
  p_options     jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if p_title is null or char_length(btrim(p_title)) < 3 then
    raise exception 'give the poll a title of at least 3 characters';
  end if;

  if char_length(btrim(p_title)) > 140 then
    raise exception 'keep the poll title under 140 characters';
  end if;

  if p_description is not null and char_length(p_description) > 2000 then
    raise exception 'keep the poll description under 2000 characters';
  end if;

  if p_closes_at is null or p_closes_at <= now() then
    raise exception 'choose a voting deadline in the future';
  end if;

  if p_options is null or jsonb_typeof(p_options) <> 'array' then
    raise exception 'add at least two options';
  end if;

  v_count := jsonb_array_length(p_options);
  if v_count < 2 then
    raise exception 'add at least two options';
  end if;
  if v_count > 12 then
    raise exception 'a poll can have at most 12 options';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_options) as item
    where btrim(coalesce(item ->> 'label', '')) = ''
       or char_length(btrim(item ->> 'label')) > 120
  ) then
    raise exception 'each option needs a label of 1 to 120 characters';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_options) as item
    where nullif(btrim(coalesce(item ->> 'image_url', '')), '') is not null
      and btrim(item ->> 'image_url') !~* '^https?://[^[:space:]]+$'
  ) then
    raise exception 'option images must be http or https links';
  end if;

  if exists (
    select lower(btrim(item ->> 'label'))
    from jsonb_array_elements(p_options) as item
    group by lower(btrim(item ->> 'label'))
    having count(*) > 1
  ) then
    raise exception 'each option needs a different name';
  end if;
end;
$$;

revoke all on function public.validate_poll_draft(text, text, timestamptz, jsonb)
  from public;

-- ---------------------------------------------------------------------------
-- create_poll
-- ---------------------------------------------------------------------------
create or replace function public.create_poll(
  p_group_id           uuid,
  p_title              text,
  p_description        text,
  p_closes_at          timestamptz,
  p_selection          public.poll_selection,
  p_is_anonymous       boolean,
  p_results_visibility public.poll_results_visibility,
  p_options            jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_poll_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if not public.can_edit_group(p_group_id) then
    raise exception 'not allowed to create polls';
  end if;

  perform public.validate_poll_draft(p_title, p_description, p_closes_at, p_options);

  insert into public.polls (
    group_id, created_by, title, description, closes_at, selection,
    is_anonymous, results_visibility
  )
  values (
    p_group_id, auth.uid(), btrim(p_title), nullif(btrim(coalesce(p_description, '')), ''),
    p_closes_at, coalesce(p_selection, 'single'), coalesce(p_is_anonymous, false),
    coalesce(p_results_visibility, 'after_vote')
  )
  returning id into v_poll_id;

  insert into public.poll_options (poll_id, label, image_url, position)
  select
    v_poll_id,
    btrim(item ->> 'label'),
    nullif(btrim(coalesce(item ->> 'image_url', '')), ''),
    (ordinality - 1)::integer
  from jsonb_array_elements(p_options) with ordinality as item(item, ordinality);

  return v_poll_id;
end;
$$;

revoke all on function public.create_poll(
  uuid, text, text, timestamptz, public.poll_selection, boolean,
  public.poll_results_visibility, jsonb
) from public;
grant execute on function public.create_poll(
  uuid, text, text, timestamptz, public.poll_selection, boolean,
  public.poll_results_visibility, jsonb
) to authenticated;

-- ---------------------------------------------------------------------------
-- update_poll: creator or group admin, and only before the first vote.
-- ---------------------------------------------------------------------------
create or replace function public.update_poll(
  p_poll_id            uuid,
  p_title              text,
  p_description        text,
  p_closes_at          timestamptz,
  p_selection          public.poll_selection,
  p_is_anonymous       boolean,
  p_results_visibility public.poll_results_visibility,
  p_options            jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_group_id   uuid;
  v_created_by uuid;
  v_status     public.poll_status;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select group_id, created_by, status
    into v_group_id, v_created_by, v_status
  from public.polls
  where id = p_poll_id
  for update;

  if v_group_id is null then
    raise exception 'poll not found';
  end if;

  if not public.is_group_member(v_group_id) then
    raise exception 'poll not found';
  end if;

  if not (v_created_by = auth.uid() or public.is_group_admin(v_group_id)) then
    raise exception 'not allowed to edit this poll';
  end if;

  if v_status <> 'open' then
    raise exception 'only an open poll can be edited';
  end if;

  if exists (
    select 1 from public.poll_votes where poll_id = p_poll_id
  ) then
    raise exception 'voting has already started, so this poll can no longer be edited';
  end if;

  perform public.validate_poll_draft(p_title, p_description, p_closes_at, p_options);

  update public.polls
  set title = btrim(p_title),
      description = nullif(btrim(coalesce(p_description, '')), ''),
      closes_at = p_closes_at,
      selection = coalesce(p_selection, selection),
      is_anonymous = coalesce(p_is_anonymous, is_anonymous),
      results_visibility = coalesce(p_results_visibility, results_visibility)
  where id = p_poll_id;

  -- No votes exist, so replacing the options is safe and keeps ids simple.
  delete from public.poll_options where poll_id = p_poll_id;

  insert into public.poll_options (poll_id, label, image_url, position)
  select
    p_poll_id,
    btrim(item ->> 'label'),
    nullif(btrim(coalesce(item ->> 'image_url', '')), ''),
    (ordinality - 1)::integer
  from jsonb_array_elements(p_options) with ordinality as item(item, ordinality);

  return p_poll_id;
end;
$$;

revoke all on function public.update_poll(
  uuid, text, text, timestamptz, public.poll_selection, boolean,
  public.poll_results_visibility, jsonb
) from public;
grant execute on function public.update_poll(
  uuid, text, text, timestamptz, public.poll_selection, boolean,
  public.poll_results_visibility, jsonb
) to authenticated;

-- ---------------------------------------------------------------------------
-- save_poll_votes: replace this member's ballot in one transaction.
--
-- SELECT ... FOR UPDATE serialises two rapid submissions from the same person,
-- so a single-choice poll cannot end up with two options through a race.
-- An empty array clears the vote before the deadline.
-- ---------------------------------------------------------------------------
create or replace function public.save_poll_votes(
  p_poll_id    uuid,
  p_option_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_group_id  uuid;
  v_status    public.poll_status;
  v_selection public.poll_selection;
  v_closes_at timestamptz;
  v_ids       uuid[];
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select group_id, status, selection, closes_at
    into v_group_id, v_status, v_selection, v_closes_at
  from public.polls
  where id = p_poll_id
  for update;

  if v_group_id is null or not public.is_group_member(v_group_id) then
    raise exception 'poll not found';
  end if;

  if v_status <> 'open' then
    raise exception 'this poll is closed';
  end if;

  if v_closes_at <= now() then
    raise exception 'the voting deadline has passed';
  end if;

  select coalesce(array_agg(distinct item), '{}')
    into v_ids
  from unnest(coalesce(p_option_ids, '{}'::uuid[])) as item
  where item is not null;

  if v_selection = 'single' and coalesce(array_length(v_ids, 1), 0) > 1 then
    raise exception 'this poll only allows one choice';
  end if;

  if exists (
    select 1
    from unnest(v_ids) as item
    left join public.poll_options o
      on o.id = item and o.poll_id = p_poll_id
    where o.id is null
  ) then
    raise exception 'that option does not belong to this poll';
  end if;

  delete from public.poll_votes
  where poll_id = p_poll_id and user_id = auth.uid();

  if coalesce(array_length(v_ids, 1), 0) > 0 then
    insert into public.poll_votes (poll_id, option_id, user_id)
    select p_poll_id, item, auth.uid()
    from unnest(v_ids) as item;
  end if;
end;
$$;

revoke all on function public.save_poll_votes(uuid, uuid[]) from public;
grant execute on function public.save_poll_votes(uuid, uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- close_poll / cancel_poll
-- ---------------------------------------------------------------------------
create or replace function public.close_poll(p_poll_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_group_id   uuid;
  v_created_by uuid;
  v_status     public.poll_status;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select group_id, created_by, status
    into v_group_id, v_created_by, v_status
  from public.polls
  where id = p_poll_id
  for update;

  if v_group_id is null or not public.is_group_member(v_group_id) then
    raise exception 'poll not found';
  end if;

  if not (v_created_by = auth.uid() or public.is_group_admin(v_group_id)) then
    raise exception 'not allowed to close this poll';
  end if;

  if v_status <> 'open' then
    return;
  end if;

  update public.polls
  set status = 'closed', closed_at = now()
  where id = p_poll_id and status = 'open';
end;
$$;

revoke all on function public.close_poll(uuid) from public;
grant execute on function public.close_poll(uuid) to authenticated;

create or replace function public.cancel_poll(p_poll_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_group_id   uuid;
  v_created_by uuid;
  v_status     public.poll_status;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select group_id, created_by, status
    into v_group_id, v_created_by, v_status
  from public.polls
  where id = p_poll_id
  for update;

  if v_group_id is null or not public.is_group_member(v_group_id) then
    raise exception 'poll not found';
  end if;

  if not (v_created_by = auth.uid() or public.is_group_admin(v_group_id)) then
    raise exception 'not allowed to cancel this poll';
  end if;

  if v_status <> 'open' then
    raise exception 'only an open poll can be cancelled';
  end if;

  update public.polls
  set status = 'cancelled', cancelled_at = now()
  where id = p_poll_id and status = 'open';
end;
$$;

revoke all on function public.cancel_poll(uuid) from public;
grant execute on function public.cancel_poll(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- poll_results
--
-- Returns aggregate counts and the caller's own ballot. Option counts are
-- withheld until the poll's visibility rule allows them; voter names are
-- withheld entirely for anonymous polls.
-- ---------------------------------------------------------------------------
create or replace function public.poll_results(p_poll_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_group_id          uuid;
  v_created_by        uuid;
  v_status            public.poll_status;
  v_closes_at         timestamptz;
  v_visibility        public.poll_results_visibility;
  v_anonymous         boolean;
  v_can_see           boolean;
  v_has_voted         boolean;
  v_my_options        jsonb;
  v_options           jsonb;
  v_voters            jsonb;
  v_total_voters      integer;
  v_total_votes       integer;
  v_member_count      integer;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select group_id, created_by, status, closes_at, results_visibility, is_anonymous
    into v_group_id, v_created_by, v_status, v_closes_at, v_visibility, v_anonymous
  from public.polls
  where id = p_poll_id;

  if v_group_id is null or not public.is_group_member(v_group_id) then
    raise exception 'poll not found';
  end if;

  -- Lazily close an expired poll so the first member to look sees the truth.
  if v_status = 'open' and v_closes_at <= now() then
    update public.polls
    set status = 'closed', closed_at = now()
    where id = p_poll_id and status = 'open';
    v_status := 'closed';
  end if;

  select coalesce(jsonb_agg(option_id), '[]'::jsonb)
    into v_my_options
  from public.poll_votes
  where poll_id = p_poll_id and user_id = auth.uid();

  v_has_voted := jsonb_array_length(v_my_options) > 0;

  v_can_see :=
    v_visibility = 'always'
    or v_status <> 'open'
    or v_has_voted
    or v_created_by = auth.uid()
    or public.is_group_admin(v_group_id);

  select count(distinct user_id)::integer, count(*)::integer
    into v_total_voters, v_total_votes
  from public.poll_votes
  where poll_id = p_poll_id;

  select count(*)::integer
    into v_member_count
  from public.group_members
  where group_id = v_group_id;

  if v_can_see then
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'option_id', o.id,
          'count', coalesce(c.vote_count, 0)
        )
        order by o.position, o.created_at
      ),
      '[]'::jsonb
    )
    into v_options
    from public.poll_options o
    left join (
      select option_id, count(*)::integer as vote_count
      from public.poll_votes
      where poll_id = p_poll_id
      group by option_id
    ) c on c.option_id = o.id
    where o.poll_id = p_poll_id;
  else
    select coalesce(
      jsonb_agg(
        jsonb_build_object('option_id', o.id, 'count', 0)
        order by o.position, o.created_at
      ),
      '[]'::jsonb
    )
    into v_options
    from public.poll_options o
    where o.poll_id = p_poll_id;
  end if;

  if v_can_see and not v_anonymous then
    select coalesce(jsonb_agg(entry order by entry ->> 'name'), '[]'::jsonb)
    from (
      select jsonb_build_object(
        'user_id', v.user_id,
        'name', coalesce(
          nullif(btrim(p.full_name), ''),
          split_part(p.email, '@', 1)
        )
      ) as entry
      from (
        select user_id, max(created_at) as last_vote
        from public.poll_votes
        where poll_id = p_poll_id
        group by user_id
      ) v
      join public.profiles p on p.id = v.user_id
    ) names
    into v_voters;
  else
    v_voters := '[]'::jsonb;
  end if;

  return jsonb_build_object(
    'status', v_status,
    'can_see_results', v_can_see,
    'has_voted', v_has_voted,
    'my_option_ids', v_my_options,
    'options', v_options,
    'voters', v_voters,
    'total_voters', v_total_voters,
    'total_votes', v_total_votes,
    'member_count', v_member_count,
    'is_anonymous', v_anonymous
  );
end;
$$;

revoke all on function public.poll_results(uuid) from public;
grant execute on function public.poll_results(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- sync_group_polls
--
-- Called when a group or its polls are opened. Closes expired polls (which
-- notifies everyone through the status trigger) and sends one deadline
-- reminder per non-voter inside the final 24 hours.
-- ---------------------------------------------------------------------------
create or replace function public.sync_group_polls(p_group_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_poll   record;
  v_member uuid;
begin
  if auth.uid() is null then
    return;
  end if;

  if not exists (
    select 1
    from public.group_members
    where group_id = p_group_id and user_id = auth.uid()
  ) then
    return;
  end if;

  update public.polls
  set status = 'closed', closed_at = now()
  where group_id = p_group_id
    and status = 'open'
    and closes_at <= now();

  for v_poll in
    select id, created_by
    from public.polls
    where group_id = p_group_id
      and status = 'open'
      and deadline_reminder_sent_at is null
      and closes_at > now()
      and closes_at <= now() + interval '24 hours'
  loop
    update public.polls
    set deadline_reminder_sent_at = now()
    where id = v_poll.id
      and deadline_reminder_sent_at is null;

    if found then
      for v_member in
        select gm.user_id
        from public.group_members gm
        where gm.group_id = p_group_id
          and not exists (
            select 1
            from public.poll_votes v
            where v.poll_id = v_poll.id
              and v.user_id = gm.user_id
          )
      loop
        perform public.push_poll_notification(
          v_member,
          v_poll.created_by,
          'poll_deadline',
          v_poll.id,
          'poll-deadline:' || v_poll.id::text || ':' || v_member::text
        );
      end loop;
    end if;
  end loop;
end;
$$;

revoke all on function public.sync_group_polls(uuid) from public;
grant execute on function public.sync_group_polls(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Removing a member clears their votes in that group. Their ballot no longer
-- counts, and a rejoining member starts fresh.
-- ---------------------------------------------------------------------------
create or replace function public.purge_removed_member_poll_votes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.poll_votes v
  using public.polls p
  where v.poll_id = p.id
    and p.group_id = old.group_id
    and v.user_id = old.user_id;

  return old;
end;
$$;

drop trigger if exists group_members_purge_poll_votes on public.group_members;
create trigger group_members_purge_poll_votes
  after delete on public.group_members
  for each row execute function public.purge_removed_member_poll_votes();

revoke all on function public.purge_removed_member_poll_votes() from public;

notify pgrst, 'reload schema';
