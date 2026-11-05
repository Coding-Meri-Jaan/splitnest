# SplitNest

An **India-first group expense sharing** app, inspired by Splitwise. SplitNest is
built for trips, flats, office lunches, and festive get-togethers — track who
paid, who owes, and settle up in ₹.

> **Phase 2 — Backend.** Real accounts, groups, expenses, and settlements backed
> by Supabase (Postgres + Auth + Row Level Security). Payments are **not**
> processed: settlements can be recorded, and a UPI deep link opens the payee's
> app with the amount pre-filled.

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

The anon key is safe to expose: Row Level Security decides what each signed-in
user can read or write. Never put the `service_role` key in this app.

## 3. Configure Supabase Auth

In **Authentication → URL Configuration**:

- **Site URL**: `http://localhost:3000` locally, your Netlify URL in production.
- **Redirect URLs**: add both
  - `http://localhost:3000/auth/confirm`
  - `https://<your-site>.netlify.app/auth/confirm`

Email + password is enabled by default. Keeping **Confirm email** on means new
users must click the emailed link before signing in.

> **Hitting "email rate limit exceeded"?** Supabase's built-in email service
> only sends a handful of messages per hour, and it is not meant for
> production. For demos and testing, either turn **Confirm email** off under
> **Authentication → Sign In / Providers → Email**, or confirm users manually
> from **Authentication → Users**. For real traffic, connect your own SMTP
> provider (Resend, Brevo, Postmark) under **Authentication → Emails → SMTP
> Settings**.

> **Emails never arrive?** The built-in mailer only delivers to addresses that
> belong to your organization's team (Organization → Team) and is capped at 2
> messages per hour. Configure custom SMTP to reach everyone. Supabase applies a
> default limit of 30 messages per hour to custom SMTP; raise it under
> **Authentication → Rate Limits** once your sending reputation is established.

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
- Balances are derived in TypeScript from expenses + splits + settlements
  (`computeNetBalances`) and cleared with `simplifyDebts`, which produces the
  fewest transfers. Nothing is stored as a running balance, so the ledger is the
  only source of truth.

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
  re-validates membership and split totals server-side.
- **Auth checks happen close to the data**, not just in the proxy: every page and
  Server Action calls `getCurrentUser()` and the database enforces row access.

## Project structure

```
src/
├─ app/
│  ├─ (auth)/                  # login, signup, forgot/reset password
│  ├─ auth/confirm/route.ts    # exchanges email link for a session
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
│  ├─ auth/                    # server actions, session user, site URL
│  ├─ data/                    # read queries + server actions
│  ├─ supabase/                # browser/server clients, proxy refresh
│  ├─ money.ts + money.test.ts # paise parsing, splits, balances
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

1. Sign up → confirm email → land on `/dashboard`.
2. Create a group; you appear as **Owner**.
3. Add a second account by email (they must have signed up first).
4. Add an expense split equally between everyone; check the per-person share.
5. Add a ₹0.03 expense between 2 people — shares must be ₹0.02 / ₹0.01.
6. Record a settlement; balances and suggested transfers update.
7. Add a UPI id in **Settings**, then use **Pay via UPI** on a suggested
   transfer.
8. Try opening another user's group id directly — you should get a 404.
