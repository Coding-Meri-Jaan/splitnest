# Feature 3 — Group polls: executable QA plan

Run this after `supabase/migrations/0007_group_polls.sql` and
`supabase/migrations/0008_discussion_improvements.sql` have been applied to the
project the test site points at. Apply 0007 first, then 0008. Every phase lists
the exact action and the result that counts as a pass.

- Live site: https://splitnest-payments.netlify.app
- Health probe: https://splitnest-payments.netlify.app/api/health
- Migration files: `supabase/migrations/0007_group_polls.sql`,
  `supabase/migrations/0008_discussion_improvements.sql`
- Deployed commit for the poll feature: `9723b1a`
- Discussion follow-up checks: `docs/qa/discussion-improvements-qa.md`

## 0. Accounts and test data

| Role | Account | Password |
| --- | --- | --- |
| Owner / poll creator | `snqaownermwfejg0z@guerrillamailblock.com` | `SplitNest#QA2026aa!` |
| Peer member | `snqapeermwfekp2s@guerrillamailblock.com` | `SplitNest#QA2026aa!` |

Use a disposable group, e.g. `Poll QA <date>`, so leftover polls do not matter.
Group page → Settings → Members is where roles (Owner / Co-owner / Editor /
Viewer) are changed.

> Email confirmation is ON in production. Both QA accounts must already be
> confirmed before this plan starts.

## 1. Migration gate

1. Open the Supabase SQL editor for project `ormodcniraaxctqdxunz`.
2. Paste the whole contents of `supabase/migrations/0007_group_polls.sql` and
   run it. Then paste `supabase/migrations/0008_discussion_improvements.sql`
   and run it. Re-running is safe: tables, indexes, columns, and functions are
   idempotent, and constraints/triggers are dropped before being recreated.
3. Verify the objects landed:

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('polls', 'poll_options', 'poll_votes')
order by table_name;

select proname
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and proname in (
    'create_poll', 'update_poll', 'save_poll_votes', 'close_poll',
    'cancel_poll', 'poll_results', 'sync_group_polls'
  )
order by proname;
```

Expected: three tables and seven functions.

4. Open `/api/health`.

Pass: `pollsSchema` is `"ok"`, the `polls` / `poll_options` / `poll_votes`
entries are `"ok"`, and the `nextStep` no longer mentions `0007_group_polls.sql`.

Fail: `pollsSchema` is `"missing"` → the migration did not run against the same
project the site uses. Re-check the project ref.

## 2. Create a poll

1. Sign in as the owner. Open the test group → **Polls** → **New poll**.
2. Fill:
   - Question: `Where should we eat on Saturday?`
   - Details: `Pick one. We'll book at 8pm.`
   - Deadline: 3 days out (the default)
   - Choices: **Single choice**
   - Results: **Always visible**
   - Anonymous: off
   - Options: `Beach shack`, `Rooftop cafe`, `Tibetan kitchen`
3. Submit.

Pass:
- Redirects to the poll page with `?created=1` and the “Poll created” banner.
- Header shows `Open`, `Single choice`, `Always visible`.
- Ballot lists all three options.
- Turnout reads `0 of N members`, `0%`.
- The peer account gets a `poll_created` notification (“… started a poll …”).
- The group page shows a Polls card with `1 open · 0 completed`.
- Creating a poll with a past deadline, 1 option, 13 options, or duplicate
  labels is rejected by the form and, if forced, by the database.

## 3. Voting

1. As the peer, open the same poll and cast a vote for `Rooftop cafe`.
2. Refresh. As the owner, cast a vote for `Beach shack`.

Pass:
- Each vote shows a confirmation, `You voted`, and one more voter in turnout.
- Percentages and counts update after refresh (no realtime expected).
- Winner/leader label follows the current highest count.
- The peer changes their vote to `Tibetan kitchen`; the old option’s count drops
  and the new one rises. No duplicate voter is created.

3. As the owner, create a **multiple choice** poll with 4 options and vote for 2.
   As the peer, vote for 2 different options.

Pass: both selections persist, counts are per option, and turnout counts people
(not selections) while the vote total counts selections.

4. Open the ballot with a single-choice poll and confirm only one option can be
   selected at a time (radio behaviour).

## 4. Results visibility matrix

Use three polls created by the owner and a fresh viewer who has not voted (the
peer can be reset by using a third account, or create a new disposable account).

| Setting | Non-voter, poll open | Voter, poll open | After close |
| --- | --- | --- | --- |
| Always visible | sees counts | sees counts | sees counts |
| After you vote | sees “Results are locked” | sees counts | sees counts |
| When the poll closes | sees “Results are locked” | sees locked | sees counts |

Pass: no setting leaks counts to a non-voter before the rule allows it, and the
creator/group admin can always see counts while the poll is open.

## 5. Anonymous polls

1. Create an **anonymous** poll, have both accounts vote.
2. Open it as the owner (the creator) and as the peer.

Pass:
- Counts, percentages, winner, and turnout are visible.
- No “Who voted” names are rendered for anyone, including the creator.
- The ballot still marks the viewer’s own pick as `Your pick`.
- Database check (as postgres):

```sql
select count(*) from public.poll_votes
where poll_id = '<poll-id>';
```

The rows exist, but `poll_results()` returns `voters: []` for anonymous polls.

## 6. Deadlines

1. Create a poll with a deadline a few minutes out, then try to vote after it.
   To avoid waiting, move the deadline with SQL:

```sql
update public.polls
set closes_at = now() - interval '1 minute'
where id = '<poll-id>';
```

2. Refresh the poll page and try to vote.

Pass:
- The page shows the poll as closed and the final results.
- `save_poll_votes` rejects with “the voting deadline has passed.”
- The first read (or `sync_group_polls`) flips `status` to `closed` and sets
  `closed_at`; members get a `poll_closed` notification.
- Creating or editing a poll with a past deadline is rejected.

## 7. Edit rules

1. As the owner, edit a poll that has **no votes**: change the title, deadline,
   add/remove options, change visibility. Save.

Pass: changes persist and `updated=1` is shown.

2. Have the peer vote, then try to open the edit page as the owner.

Pass: edit page is not available; the poll page explains that voting has started
and the question/options are locked. Closing/cancelling remains available.

3. As a non-creator Editor, open the poll page.

Pass: no Edit / Close / Cancel controls; a direct RPC call is rejected.

## 8. Close and cancel

1. As the creator, open an active poll → **Close voting**.

Pass: status becomes `Closed`, results are final, the ballot disappears, and
every member (including voters) gets a `poll_closed` notification. The creator
does not notify themselves.

2. Create another poll and **Cancel poll** (confirm the dialog).

Pass: status becomes `Cancelled`, results show the cancellation notice, votes
stop counting, and members get `poll_cancelled`.

3. Sign in as a Co-owner who did not create the poll and close another poll.

Pass: allowed (group admin). A Viewer or plain Editor gets “Only the poll creator
or a group admin can close this poll.” When a Co-owner cancels a poll, the
notification credits the Co-owner as the actor, and the creator still receives
it (the person who performed the action does not notify themselves).

## 9. Notifications and preferences

1. Notifications page (bell icon) lists poll events with the right icons and
   copy; clicking one opens the poll page and marks it read.
2. Settings → Notifications → turn **Group polls** off.
3. Create/vote/close a poll; check the peer account.

Pass: no new poll notifications while the toggle is off; discussion notifications
still work. Turn it back on and confirm new poll events arrive again.

4. Deadline reminder: set an open poll’s deadline inside 24 hours, then load the
   group or polls page as the peer (who has not voted).

Pass: exactly one `poll_deadline` notification per non-voter; reloading the page
does not duplicate it. Voters do not get the reminder, but the poll creator does
if they have not voted.

## 10. Membership removal

1. With both accounts voted on a poll, remove the peer from the group
   (Settings → Members).
2. Check the poll counts and turnout as the owner.

Pass: the removed member’s votes are gone from that group’s polls, turnout drops,
and the removed member can no longer open the group or poll (RLS).

Re-add the peer; they start with no ballot on those polls.

## 11. Security / negative tests

Run in the SQL editor as postgres. These should fail; a successful write is a
finding.

```sql
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"<peer-uuid>","role":"authenticated"}';

-- 1. direct write to poll tables must be denied by RLS (no INSERT policy)
insert into public.poll_votes (poll_id, option_id, user_id)
values ('<poll-id>', '<option-id>', '<peer-uuid>');

-- 2. closing someone else's poll must be denied
select public.close_poll('<poll-id>');

-- 3. reading a poll from a group the member left must return nothing
select * from public.polls where group_id = '<group-id>';

rollback;
```

Additional checks:

- A member cannot vote for an option that belongs to a different poll; the RPC
  raises “that option does not belong to this poll.”
- A single-choice poll rejects two option ids; the RPC raises “only one choice.”
- Duplicate option labels are rejected at creation and update.
- Option images must be `http(s)://…`; `javascript:` and `data:` URLs are
  rejected by both the action and the table check.
- The creator of an anonymous poll cannot recover voter identities through the
  UI or `poll_results()`.
- A signed-out visitor cannot open any `/dashboard/groups/.../polls` route.

## 12. Regression sweep

Confirm unchanged behaviour:

- Create, edit, and delete an expense; custom splits still add up.
- Expense comments, replies, mentions, and reactions still work with their
  notifications.
- Record and delete a settlement; balances update.
- Group roles: promote/demote a member; viewer cannot add expenses.
- `/api/health` reports `splitSchema`, `rolesSchema`, `discussionSchema`, and
  `pollsSchema` all `ok`.

## 13. Known limitations (not bugs)

- Deadline reminders and auto-close run lazily when a member opens the group or
  its polls; there is no cron job, so a poll can briefly read `Open` past its
  deadline until someone views it.
- No realtime: other members’ votes appear on refresh/navigation.
- Poll option images are external URLs; no upload/storage bucket.
- Notifications are in-app only (no email/push).

## 14. Sign-off

- [ ] Migration applied; `/api/health` shows `pollsSchema: "ok"`
- [ ] Create / vote / change vote (single and multiple)
- [ ] Visibility matrix and anonymous privacy
- [ ] Deadline create, edit, expiry, reminder
- [ ] Edit lock after first vote; creator/admin close and cancel
- [ ] Notifications + preference toggle
- [ ] Removed member’s votes purged; access revoked
- [ ] Negative/security SQL checks all denied
- [ ] Expense / discussion / settlement regression sweep
