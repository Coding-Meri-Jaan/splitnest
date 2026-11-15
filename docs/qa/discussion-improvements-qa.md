# Discussion follow-up — executable QA plan

This covers the customer feedback on expense discussions: five quick reactions
plus a full picker, hover-revealed emoji controls, unlimited reply depth, and
notifications for reactions and replies.

Apply migrations in this order:

1. `supabase/migrations/0007_group_polls.sql`
2. `supabase/migrations/0008_discussion_improvements.sql`

Both are safe to re-run. The poll suite is in `docs/qa/group-polls-qa.md`.

- Live site: https://splitnest-payments.netlify.app
- Health probe: https://splitnest-payments.netlify.app/api/health
- Supabase project: `ormodcniraaxctqdxunz`

## 0. Accounts and test data

| Role | Account | Password |
| --- | --- | --- |
| Comment author / group owner | `snqaownermwfejg0z@guerrillamailblock.com` | `SplitNest#QA2026aa!` |
| Peer member | `snqapeermwfekp2s@guerrillamailblock.com` | `SplitNest#QA2026aa!` |

Use a disposable expense with a discussion, or create one:

1. Sign in as the owner and open a group.
2. Add an expense called `Discussion QA <date>`.
3. Open the expense page. The Discussion card is at the bottom.

Email confirmation is ON in production. Both QA accounts must be confirmed.

## 1. Migration gate

Run this in the Supabase SQL editor after applying 0008.

```sql
-- 1. Reply validation no longer has the one-level limit.
select prosrc
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'validate_expense_comment';
```

Pass: the source contains `reply must belong to the same expense` and does
**not** contain `replies can only be one level deep`.

```sql
-- 2. The fixed six-emoji list is gone; the structural guard is present.
select pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.expense_reactions'::regclass
  and conname = 'expense_reactions_emoji_check';
```

Pass: the definition mentions `char_length(emoji)` and `ascii(emoji)`, and does
not contain the literal `👍`.

```sql
-- 3. Notification kinds include comment reactions and poll events.
select pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.notifications'::regclass
  and conname = 'notifications_type_check';
```

Pass: the definition contains `comment_reaction`, `expense_reaction`, and all
four `poll_*` kinds.

```sql
-- 4. The reaction trigger knows how to notify a comment author.
select prosrc
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'notify_expense_reaction';
```

Pass: the source contains `comment_reaction` and `v_comment_author`.

Run the same `/api/health` check used by the poll suite.

Pass: `discussionSchema` is `"ok"` and `pollsSchema` is `"ok"` after both
migrations. A missing poll schema means 0007/0008 did not run against the
project the deployed site uses.

## 2. Hover-reveal reaction controls (desktop)

1. Open the expense discussion as the owner.
2. Look at a comment with no reactions.
3. Do not hover the comment.

Pass:
- The existing reaction counts are absent (there are none).
- A small `+`/smile trigger is visible next to the comment actions.
- The five quick emojis are not taking up space.

4. Hover anywhere over the reaction row (the chip area or the `+` trigger).

Pass:
- Five quick emojis slide into view: `👍`, `❤️`, `😂`, `🎉`, `😮`.
- Moving the pointer into the revealed row keeps it open.
- Moving away collapses it again.

5. Click the five quick emojis once each.

Pass:
- The first click adds your reaction and shows `1` next to that emoji.
- Clicking the same chip again removes it and the chip returns to the quick row.
- Clicking a different quick emoji changes your reaction instead of stacking a
  second reaction on the same comment.

6. Tab through the page without using the mouse.

Pass: when keyboard focus enters the reaction row, the quick emojis become
visible, and every chip and the `+` trigger has a visible focus ring.

7. Repeat on a phone or a touch-emulation viewport (DevTools → device toolbar).

Pass: the quick row is visible without hovering, and the `+` trigger still
opens the full picker.

## 3. Full emoji picker

1. On a comment, click the `+` trigger.
2. Inspect the popover.

Pass:
- It opens above the trigger, stays inside the viewport, and is not clipped by
  the card.
- It has category headings: Smileys, Gestures, Hearts, Food & drink, Fun &
  symbols.
- The trigger reports `aria-expanded="true"` while open.
- Every emoji button has an accessible name such as `React with 🔥`.

3. Press `Escape`.

Pass: the popover closes and focus returns to the `+` trigger.

4. Re-open it, click outside it, then re-open it and choose `🔥`.

Pass:
- It closes on the outside click.
- Choosing `🔥` closes it, adds the reaction, and the new `🔥` chip appears in
  the summary with `1`.
- The quick row no longer offers a second copy of `🔥`.
- `🔥` is not in the five quick reactions, proving arbitrary emojis work.

5. Choose a ZWJ or skin-tone emoji, for example `👨‍👩‍👧‍👦` or `👍🏽`.

Pass: it is accepted as one reaction and renders intact.

6. Refresh the page.

Pass: the chosen reaction is still there. The server accepted it without a
catalog change.

7. Existing old reactions still render.

Pass: a comment carrying `👀` or `🙌` (from before this change) still shows the
chip and count. Those emojis do not need to remain in the quick row.

## 4. Server-side and database guards

The app validates one emoji, the server action repeats that check, and the
database rejects plain text and oversized payloads. The reader also ignores a
row whose emoji is not a single emoji, so a malformed direct write cannot break
the thread.

1. In the browser, use a modified copy of the comment form or a REST call to
   submit `emoji=hello` to the reaction action.

Pass: the action returns the error `Choose a single emoji to react with.` and
adds no chip.

2. Submit `emoji=🔥🔥` the same way.

Pass: the action rejects it. Even if a row is written directly, no chip is
shown because `summarizeReactions` drops it.

3. Run the structural database checks. These are transactional and roll back.

```sql
begin;

do $$
declare
  v_comment record;
  v_user uuid;
begin
  select c.id, c.expense_id, c.group_id, c.author_id
    into v_comment
  from public.expense_comments c
  limit 1;

  if v_comment.id is null then
    raise notice 'SKIP: create an expense comment first';
    return;
  end if;

  select gm.user_id into v_user
  from public.group_members gm
  where gm.group_id = v_comment.group_id
    and gm.user_id <> v_comment.author_id
  limit 1;

  if v_user is null then
    raise notice 'SKIP: the group needs a second member';
    return;
  end if;

  delete from public.expense_reactions
  where comment_id = v_comment.id and user_id = v_user;

  insert into public.expense_reactions
    (expense_id, comment_id, group_id, user_id, emoji)
  values
    (v_comment.expense_id, v_comment.id, v_comment.group_id, v_user, '🔥');

  raise notice 'PASS: a single emoji was accepted';
end $$;

rollback;
```

Pass: the editor reports `PASS: a single emoji was accepted`, then the rollback
removes the row and its notification.

```sql
begin;

do $$
declare
  v_comment record;
  v_user uuid;
begin
  select c.id, c.expense_id, c.group_id, c.author_id
    into v_comment
  from public.expense_comments c
  limit 1;

  select gm.user_id into v_user
  from public.group_members gm
  where gm.group_id = v_comment.group_id
    and gm.user_id <> v_comment.author_id
  limit 1;

  if v_comment.id is null or v_user is null then
    raise notice 'SKIP: need a comment and a second group member';
    return;
  end if;

  begin
    insert into public.expense_reactions
      (expense_id, comment_id, group_id, user_id, emoji)
    values
      (v_comment.expense_id, v_comment.id, v_comment.group_id, v_user, 'hello');
    raise exception 'FAIL: plain text was accepted';
  exception when check_violation then
    raise notice 'PASS: plain text was rejected by the database';
  end;
end $$;

rollback;
```

Pass: `PASS: plain text was rejected by the database`.

## 5. Unlimited reply tree

1. As the owner, post a top-level comment: `Depth 0`.
2. On that comment, click **Reply** and post `Depth 1`.
3. On the reply, click **Reply** again and post `Depth 2`.
4. Continue to `Depth 3`, `Depth 4`, and `Depth 5`.

Pass:
- The **Reply** action exists on every comment, including replies.
- Every reply posts and appears under its parent, not at the top level.
- The thread keeps its order after a refresh.
- Visual indentation grows for the first two reply levels, then stops growing.
  From depth 3 onward, the timestamp line adds `replying to <name>` so context
  is not lost.
- The page does not become a one-character column on a phone.
- Deleting `Depth 3` warns that everything underneath it will be removed, and
  does remove `Depth 4` and `Depth 5`.

5. Mention a member in a deep reply with `@<name>`.

Pass: the mention is highlighted and the mentioned member receives a mention
notification pointing at the expense.

## 6. Reply and reaction notifications

### Reply notifications

1. Sign in as the peer in a second browser profile.
2. With the owner signed in, reply directly to a comment written by the peer.

Pass: the peer receives a `comment_reply` notification: `<owner> replied to your
comment on “<expense>”`. Opening it lands on the expense discussion.

3. Reverse the roles: peer replies to an owner's comment.

Pass: the owner receives the same kind of notification.

4. Peer replies to a reply that the owner wrote.

Pass: the owner (the immediate parent author) is notified. This is the new
nested-reply path that was previously impossible.

### Reaction notifications

1. As the peer, react to a comment written by the owner with `🔥` from the
   picker.
2. Open the owner's notifications page (or refresh it).

Pass:
- The owner has a notification: `<peer> reacted 🔥 your comment on “<expense>”`.
- The icon is the heart/comment-reaction icon, not the expense-reaction icon.
- Clicking it opens the same expense discussion.
- Marking it read and using **Mark all as read** still work.

3. As the peer, add a reaction to a reply written by the owner.

Pass: the reply author is notified too. Reactions on any comment depth share the
same path.

4. Remove the peer's reaction, then add it again.

Pass: the existing notification is reused rather than duplicated endlessly for
the same person/comment/emoji.

5. As the owner, react to your own comment.

Pass: no self-notification is created.

### Preference gate

1. Owner → Settings → Notifications. Turn off
   **Reactions to my expenses and comments**. Save.
2. Peer reacts to a different owner comment.

Pass: no `comment_reaction` notification is created. Expense-reaction
notifications are also suppressed because they share the same toggle.

3. Turn the toggle back on and repeat.

Pass: notifications resume.

4. Turn off **Replies to my comments**, then have the peer reply to the owner.

Pass: no `comment_reply` notification is created. Turn it back on.

## 7. Regression checks

Run these after the discussion changes:

1. Expense-level reactions still work from the Reactions block. The five quick
   emojis and the `+` picker behave the same way, and the expense creator is
   notified with `expense_reaction`.
2. Comments can still be edited by their author and deleted by their author or
   a group admin.
3. `@mentions` still highlight and notify.
4. The activity page still shows reaction chips and comment counts.
5. Polls still create, vote, close, and notify. Run the relevant sections of
   `docs/qa/group-polls-qa.md`.
6. `/api/health` still reports `discussionSchema: "ok"` and, after 0007,
   `pollsSchema: "ok"`.

## 8. Expected limitations

- No realtime subscriptions: refresh the page to see another member's new
  comment or reaction.
- Changing an existing reaction from one emoji to another does not send a second
  notification. Removing it and adding a new one can. This deliberately avoids
  notification spam while someone browses the picker.
- The database constraint blocks text and oversized payloads. Multi-emoji
  payloads are rejected by the app and ignored when read, not by a grapheme
  parser inside PostgreSQL.
