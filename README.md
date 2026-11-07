# SplitNest

An **India-first group expense sharing** app, inspired by Splitwise. SplitNest is
built for trips, flats, office lunches, and festive get-togethers — track who
paid, who owes, and settle up in ₹.

> **Phase 2 — Complete.** Real accounts, groups, expenses, settlements, and
> day-to-day group management backed by Supabase (Postgres + Auth + Row Level
> Security). Payments are **not** processed: settlements can be recorded, and a
> UPI deep link opens the payee's app with the amount pre-filled.

## Tech stack

| Concern       | Choice                                          |
| ------------- | ----------------------------------------------- |
| Framework     | Next.js 16 (App Router, Turbopack)              |
| Language      | TypeScript (strict)                             |
| Styling       | Tailwind CSS v4                                 |
| UI primitives | shadcn/ui (Base UI flavor) + lucide-react icons |
| Backend       | Supabase (Postgres, Auth, RLS)                  |
| Linting       | ESLint (`eslint-config-next`)                   |
| Testing       | Vitest + React Testing Library (jsdom)          |
| Package mgr   | npm                                             |

## Prerequisites

- **Node.js 24+** (required by the installed tooling)
- **npm 11+**
- A free [Supabase](https://supabase.com) project

> On Windows, if `npm` is blocked by the PowerShell execution policy, use
> `npm.cmd` instead of `npm` for the commands below.

## 1. Create the Supabase project

1. Create a project at <https://supabase.com/dashboard>. Pick the region closest
   to your users (Mumbai for India).
2. Open **SQL Editor** and run these files **in order**, pasting each file's
   contents:
   - `supabase/migrations/0001_init.sql` — tables, indexes, triggers, RLS
   - `supabase/migrations/0002_expenses_and_invites.sql` — invite lookup and
     atomic expense creation
   - `supabase/migrations/0003_profile_names.sql` — stop using email handles as
     display names and repair existing profiles
   - `supabase/migrations/0004_custom_splits.sql` — custom split modes (exact
     amounts, percentages, weighted shares) and the matching expense RPC
3. Copy the project URL and anon key from **Project Settings → API**.

## 2. Configure environment variables

```bash
cp .env.example .env.local
```

Then fill in `.env.local`:

| Variable                        | Where to find it                              |
| ------------------------------- | --------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Project Settings → API → Project URL          |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project Settings → API → anon/public key      |
| `NEXT_PUBLIC_SITE_URL`          | `http://localhost:3000` locally               |
| `AUTH_EMAIL_DNS_CHECK`          | Optional; set `off` to skip the DNS lookup    |

The anon key is safe to expose: Row Level Security decides what each signed-in
user can read or write. Never put the `service_role` key in this app.

After deploying, open `/api/health`. It reports whether Supabase is configured,
which migrations are missing, whether email confirmation and Google sign-in are
enabled, and the active password policy — without exposing keys or user data.

## 3. Configure Supabase Auth

In **Authentication → URL Configuration**:

- **Site URL**: `http://localhost:3000` locally, your Netlify URL in production.
- **Redirect URLs**: add both
  - `http://localhost:3000/auth/confirm`
  - `https://<your-site>.netlify.app/auth/confirm`

Email + password is enabled by default. **Confirm email must stay on.** The app
now fails closed: `signupAction` reads the project's auth settings and refuses
email/password signup whenever Supabase is auto-confirming addresses, or when
the settings cannot be read. A made-up address therefore cannot become a
working account through email signup.

SplitNest still validates the address first (format, placeholder local parts,
disposable domains, reserved TLDs, DNS MX/A), but only a delivered confirmation
link proves the inbox exists.

> **Accounts created before this gate** were auto-confirmed, so their addresses
> were never proven. Google-linked accounts are already verified by Google.
> Email-only accounts can be forced through real verification without deleting
> their data:
>
> ```bash
> npm run auth:reverify -- --dry-run   # list who needs it, no changes
> npm run auth:reverify -- --apply     # clear + send a fresh link
> ```
>
> The script only runs after Confirm email and custom SMTP are configured. It
> skips Google-linked accounts, and if a confirmation email cannot be sent it
> restores that account's previous confirmation so nobody is locked out.
> Accounts that never open the new link stay unconfirmed and cannot sign in.

### One-command setup (recommended)

1. Create a free SMTP account with any provider. If you do not own a domain,
   verify a single sender address — SendGrid and Brevo both support this.
2. Create a Supabase personal access token at
   <https://supabase.com/dashboard/account/tokens>.
3. Fill `SUPABASE_ACCESS_TOKEN`, `AUTH_SMTP_*`, and `AUTH_SITE_URL` in
   `.env.local` (see `.env.example`).
4. Preview, then apply:

```bash
npm run auth:configure -- --dry-run
npm run auth:configure
```

The script sets `mailer_autoconfirm=false`, disables sign-in by unverified
users, stores the SMTP credentials, and keeps `/auth/confirm` in the redirect
allow-list. It never prints secrets. `AUTH_REDIRECT_URLS` is replaced as a
whole, so include every URL you need if you override it.

### Google-only setup (no SMTP yet)

To unblock account creation with Google while email/SMTP is still being
arranged:

1. Create the OAuth client described in [Google sign-in](#google-sign-in).
2. Fill `SUPABASE_ACCESS_TOKEN`, `AUTH_SITE_URL`, `GOOGLE_CLIENT_ID`, and
   `GOOGLE_CLIENT_SECRET` in `.env.local`.
3. Preview, then apply:

```bash
npm run auth:configure -- --google-only --dry-run
npm run auth:configure -- --google-only
```

This enables the provider without touching email settings. Email/password
signup stays blocked and `/api/health` keeps reporting
`emailSignupAllowed: false` — that is expected in this mode. Run the normal
mode later, once custom SMTP exists, to turn on verified email signup.

### Dashboard alternative

1. **Authentication → Sign In / Providers → Email**: turn **Confirm email** on.
2. **Authentication → Emails → SMTP Settings**: add the provider credentials
   and a verified From address.
3. **Authentication → URL Configuration**: keep both `/auth/confirm` URLs.

Until one of these is done, email/password signup shows a clear "paused"
message and only Google sign-in can create accounts. Existing accounts can
still log in.

> **Local testing:** add test users from **Authentication → Users** with
> **Auto Confirm User** enabled, or use Google. Do not turn Confirm email off
> on a project you deploy.

> **Hitting "email rate limit exceeded"?** Supabase's built-in sender hit its
> cap. Wait about an hour, or configure custom SMTP. The app shows a hint that
> points here.
>
> **Emails never arrive?** That is almost always the built-in mailer. Custom
> SMTP reaches everyone. Supabase applies a default limit of 30 messages per
> hour to custom SMTP; raise it under **Authentication → Rate Limits** once your
> sending reputation is established.
>
> **Link expired or lost?** Trying to log in with an unconfirmed address shows a
> **Resend confirmation email** button right on the login screen, so nobody gets
> locked out while waiting for a new link.

### Google sign-in

1. Create an OAuth client in the [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   (type **Web application**).
2. Add these **Authorized redirect URIs** (copy the callback shown by Supabase,
   it is `https://<project-ref>.supabase.co/auth/v1/callback`):
   - `https://<project-ref>.supabase.co/auth/v1/callback`
3. In Supabase, open **Authentication → Sign In / Providers → Google**, enable
   it, and paste the Google **Client ID** and **Client Secret** — or set
   `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` in `.env.local` and run
   `npm run auth:configure -- --google-only`.
4. Keep `<your-site>/auth/confirm` in Supabase's redirect allow-list. SplitNest
   sends Google back there with `prompt=select_account`, so the account chooser
   always appears.

Until the provider is enabled, the Google button is visible but returns a clear
"not enabled yet" message. `/api/health` reports whether Google is on.

### Password policy

Signup and password reset enforce, in `src/lib/auth/password.ts`:

- 10–72 characters (72 is bcrypt's limit, so nothing is silently truncated)
- at least one uppercase letter, one lowercase letter, one number, one symbol
- a short blocklist of common passwords and the app name
- no part of the person's name or email handle

Supabase's own **leaked password protection** should also be enabled under
**Authentication → Sign In / Providers → Email** for broader coverage.

### Sessions

SplitNest uses Supabase Auth cookies (`@supabase/ssr`) plus three tiny,
non-secret markers (`sn-activity`, `sn-remember`, `sn-started`). The proxy
refreshes the token on every matched request and enforces inactivity plus a hard
session limit:

| Choice at sign-in | Cookie lifetime          | Idle timeout | Hard limit |
| ----------------- | ------------------------ | ------------ | ---------- |
| **Keep me signed in** | 30 days               | 7 days       | 30 days    |
| Unchecked (default) | Browser session only   | 30 minutes   | 24 hours   |

Sessions created before these markers existed fall back to Supabase's last
sign-in time, so a stricter policy takes effect on the next request instead of
leaving an old session valid indefinitely.

`/auth/confirm` is intentionally excluded from the proxy matcher. Supabase's
`getUser()` deletes every in-flight PKCE verifier when it sees a dead session,
so letting the proxy run on the callback would break Google sign-in for anyone
whose previous session had expired.

- **Sign out** in the topbar ends the session on this device (`scope: local`).
- **Settings → Security → Sign out everywhere** revokes refresh tokens on every
  device (`scope: global`).
- Opening `/login` while signed in does **not** silently skip the form: it shows
  who you are signed in as, with **Continue**, **Verify email**, and **Use
  another account** options.

## 4. Run it

```bash
npm install
npm run dev
```

Open <http://localhost:3000>, sign up, confirm the email, then create a group.

> Tip: to test with two people without waiting on more emails, use Supabase
> **Authentication → Users → Add user**, set a password and enable
> **Auto Confirm User**. You can then log in on the site immediately — no email
> is sent and no rate limit applies.

## Scripts

| Script               | What it does                              |
| -------------------- | ----------------------------------------- |
| `npm run dev`        | Start the dev server with hot reload      |
| `npm run build`      | Create an optimized production build      |
| `npm start`          | Run the production build locally          |
| `npm run lint`       | Lint the project with ESLint              |
| `npm run typecheck`  | Type-check without emitting (`tsc --noEmit`) |
| `npm test`           | Run the test suite once (CI-friendly)     |
| `npm run test:watch` | Run tests in watch mode while developing  |

## How money is handled

- Every stored and computed amount is an **integer number of paise**
  (`amount_paise`, `share_paise`). Rupees exist only at the UI edge
  (`src/lib/money.ts`).
- Equal splits are computed in `splitEqually`: the remainder (at most *n − 1*
  paise) is handed out one paise at a time to members sorted by user id, so the
  shares always sum to the expense total and the result is deterministic.
- Four split modes are supported: **equally**, **exact amounts**, **percentages**,
  and **shares** (weights). `src/lib/splits.ts` validates each mode on both the
  client (live preview) and the server (the action re-runs the same code, so the
  preview cannot be trusted into the database).
- Exact amounts must add up to the expense total. Percentages must add up to
  exactly 100% (two decimals). Shares must contain at least one positive weight
  (up to four decimals). Zero is allowed for individual exact amounts, percentages,
  and weights, which supports "someone is on the bill but owes nothing".
- Percentage and share modes use largest-remainder allocation: every share is an
  integer number of paise, ties are broken by user id, and the shares always sum
  to the expense total. `share_paise` remains the single source of truth for
  balances; `split_value` only preserves the percentage or weight so the form can
  be edited later.
- Balances are derived in TypeScript from expenses + splits + settlements
  (`computeNetBalances`) and cleared with `simplifyDebts`, which produces the
  fewest transfers. Nothing is stored as a running balance, so the ledger is the
  only source of truth.

## Managing a nest

- **Owners** can rename or delete a group and remove members from **Group
  settings**.
- **Members** can leave from the same screen. The owner cannot leave; they must
  delete the group instead.
- A member can only be removed or leave while they have no expenses or
  settlements in the group. Delete that activity first.
- **Expense authors** can edit or delete their own expenses. The group owner can
  delete any expense, but can only edit their own. Editing recreates the expense
  and its splits atomically, then removes the old row.
- **Settlement authors** or the group owner can delete a settlement; recording a
  new one recalculates balances and suggested transfers immediately.

## Security model

- **RLS on every table.** Reads are limited to groups you belong to; expenses and
  settlements are writable by group members; profile rows are visible to you and
  people you share a group with.
- **Helper functions are `security definer`** (`is_group_member`,
  `is_group_owner`, `shares_group_with`) so policies don't recurse, and their
  `search_path` is pinned to `''`.
- **`find_user_for_invite`** lets a group owner resolve an email without opening
  up the `profiles` table to the whole world.
- **`create_expense`** writes the expense and all splits in one transaction and
  re-validates membership, split totals, and the percentage/share sums
  server-side. Editing an expense uses the same RPC, then deletes the old row
  (and rolls the new row back if that delete fails). The previous 8-argument
  function is kept during rollout so a client on the older release still works.
- **Auth checks happen close to the data**, not just in the proxy: every page and
  Server Action calls `getCurrentUser()` and the database enforces row access.
  RLS also limits who may rename a group, remove a member, or delete a
  settlement.

## Project structure

```
src/
├─ app/
│  ├─ (auth)/                  # login, signup, verify email, forgot/reset password
│  ├─ auth/confirm/route.ts    # exchanges email/OAuth link for a session
│  ├─ dashboard/
│  │  ├─ group detail, new group, new expense, settle up, settings
│  │  ├─ activity/, people/
│  │  └─ layout.tsx            # sidebar + topbar shell
│  └─ page.tsx                 # marketing landing page
├─ components/
│  ├─ auth/                    # auth forms + submit button
│  ├─ dashboard/               # forms, tables, cards
│  ├─ landing/                 # hero, features, how-it-works, CTA
│  ├─ layout/                  # site + dashboard chrome
│  ├─ shared/                  # Logo, Amount, avatars, form message
│  └─ ui/                      # shadcn/ui primitives
├─ data/sample-data.ts         # landing-page demo numbers only
├─ lib/
│  ├─ auth/                    # actions, password/email/session policy, user
│  ├─ data/                    # read queries + server actions
│  ├─ supabase/                # browser/server clients, proxy refresh
│  ├─ money.ts + money.test.ts # paise parsing, splits, balances
│  ├─ splits.ts + splits.test.ts # split modes, validation, rounding
│  ├─ upi.ts + upi.test.ts     # UPI deep links
│  └─ format.ts, categories.ts
├─ proxy.ts                    # Next 16 middleware (session refresh)
└─ types/                      # view models + generated-style DB types
supabase/migrations/           # SQL schema, RLS, functions
```

## Deploying (Netlify)

`netlify.toml` already builds with `npm run build` and publishes `.next`.

1. In **Site configuration → Environment variables**, add the three
   `NEXT_PUBLIC_*` variables. Set `NEXT_PUBLIC_SITE_URL` to your production URL.
2. Add `https://<your-site>.netlify.app/auth/confirm` to the Supabase redirect
   URLs.
3. Push to `main`; the Git integration redeploys automatically.

## Manual test checklist

### Auth and sessions

1. Sign up with a fake-looking address (`test@example.com`, `you@mailinator.com`)
   — it should be rejected with a clear message.
2. Sign up with a weak password (`password123`); the requirement list and the
   error should explain what is missing.
3. Sign up with a real address, confirm the email, and land on `/dashboard`.
4. Visit `/login` while signed in; you should see the account chooser, not an
   automatic redirect. **Use another account** signs you out on the device.
5. Sign in with **Keep me signed in** checked, close the browser, reopen it —
   you should still be signed in.
6. Sign in with it unchecked (the default); closing the browser should end the
   session, and reloading `/dashboard` after 30 idle minutes should redirect to
   `/login?error=session-expired`.
7. Open **Settings → Security**; check provider, last sign-in, and
   **Sign out everywhere**.
8. Click **Continue with Google** from login and signup; the Google account
   chooser appears and you return to `/dashboard`.

### Groups and expenses

1. Create a group; you appear as **Owner**.
2. Add a second account by email (they must have signed up first).
3. Add an expense split equally between everyone; check the per-person share.
4. Add a ₹0.03 expense between 2 people — shares must be ₹0.02 / ₹0.01.
5. Record a settlement; balances and suggested transfers update.
6. Add a UPI id in **Settings**, then use **Pay via UPI** on a suggested
   transfer.
7. Try opening another user's group id directly — you should get a 404.
8. As the owner, rename the group in **Group settings**; the new name appears
   everywhere.
9. Edit an expense you created; the amount, title, and shares update.
10. Record a settlement, then delete it; balances and suggested transfers return
    to their previous values.
11. Remove a member with no activity, then add them back by email.
12. As a member, try to leave a group where you have expenses — it should be
    blocked with a clear message. Delete your expense, then leave.
13. As the owner, delete the group; it and its expenses disappear from
    **Groups**.

### Custom splits

1. Add a ₹100 expense split by **exact amounts** (₹60 / ₹40) and save; the group
   balances show those exact shares.
2. Try exact amounts that add up to ₹99 or ₹101 — the form must block the save
   with the current total in the message.
3. Add a ₹100 expense split by **percentages** (50% / 30% / 20%); the preview and
   saved shares are ₹50 / ₹30 / ₹20.
4. Try percentages that add up to 99.99% — the form must refuse to save.
5. Add a ₹90 expense split by **shares** (2 / 1); the shares are ₹60 / ₹30.
6. Add a ₹0.01 expense split by **shares** (1 / 1); the shares must be ₹0.01 /
   ₹0.00 and still sum to the expense.
7. Edit each custom-split expense; the mode, per-person values, and shares must
   come back exactly as saved, and saving again must not change the balances.
8. Switch an expense from equal to percentages and back to equal; the leftover
   paise must stay deterministic.
9. Open `/api/health`; `splitSchema` must read `ok` after migration 0004, and the
   next-step text must name 0004 when it is missing.
