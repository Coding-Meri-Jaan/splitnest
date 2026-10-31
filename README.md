# SplitNest

An **India-first group expense sharing** app, inspired by Splitwise. SplitNest is
built for trips, flats, office lunches, and festive get-togethers — track who
paid, who owes, and settle up in ₹.

> **Phase 1 — Foundation.** This milestone is a polished, responsive marketing
> landing page plus a read-only dashboard shell backed by **sample data**.
> Authentication, a database, expense calculations, and payments are
> intentionally **not** implemented yet.

## Tech stack

| Concern      | Choice                                              |
| ------------ | --------------------------------------------------- |
| Framework    | Next.js 16 (App Router, Turbopack)                  |
| Language     | TypeScript (strict)                                 |
| Styling      | Tailwind CSS v4                                     |
| UI primitives| shadcn/ui (Base UI flavor) + lucide-react icons     |
| Linting      | ESLint (`eslint-config-next`)                       |
| Testing      | Vitest + React Testing Library (jsdom)              |
| Package mgr  | npm                                                 |

## Prerequisites

- **Node.js 24+** (required by the installed tooling; `.nvmrc` not provided)
- **npm 11+**

> On Windows, if `npm` is blocked by the PowerShell execution policy, use
> `npm.cmd` instead of `npm` for the commands below.

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Start the development server
npm run dev
```

Open <http://localhost:3000>.

## Scripts

| Script              | What it does                                             |
| ------------------- | -------------------------------------------------------- |
| `npm run dev`       | Start the dev server with hot reload                     |
| `npm run build`     | Create an optimized production build                     |
| `npm start`         | Run the production build locally                         |
| `npm run lint`      | Lint the project with ESLint                             |
| `npm run typecheck` | Type-check without emitting (`tsc --noEmit`)             |
| `npm test`          | Run the test suite once (CI-friendly)                    |
| `npm run test:watch`| Run tests in watch mode while developing                 |

## Project structure

```
src/
├─ app/
│  ├─ layout.tsx              # Root layout + global metadata/fonts
│  ├─ page.tsx                # Marketing landing page
│  ├─ globals.css             # Tailwind v4 theme tokens
│  └─ dashboard/
│     ├─ layout.tsx           # Dashboard shell (sidebar + topbar)
│     ├─ page.tsx             # Overview
│     ├─ groups/page.tsx      # All groups
│     ├─ activity/page.tsx    # All expenses
│     └─ people/page.tsx      # Members and balances
├─ components/
│  ├─ ui/                     # shadcn/ui primitives
│  ├─ layout/                 # Site header/footer, dashboard sidebar/topbar
│  ├─ landing/                # Hero, features, how-it-works, CTA
│  ├─ dashboard/              # GroupCard, BalanceList, ExpenseTable
│  └─ shared/                 # Logo, Amount, MemberAvatar, SummaryCard, PageHeader
├─ data/sample-data.ts        # Sample members, groups, expenses, balances
├─ lib/                       # format.ts, categories.ts, utils.ts
└─ types/index.ts             # Domain types
```

## Manual testing

1. Run `npm run dev` and open <http://localhost:3000>.
2. On the landing page, resize the window: the nav collapses into a menu button
   on mobile, and the hero stacks into a single column.
3. Click **Open dashboard** (or visit `/dashboard`) and use the sidebar to move
   between **Overview**, **Groups**, **Activity**, and **People**. On mobile the
   sidebar becomes a slide-out sheet.
4. Confirm the dashboard shows INR amounts (e.g. `+₹1,500`) with green/red tones
   and the sample groups, expenses, and people.
5. Toggle your OS theme to light/dark and confirm both themes look correct.

## Notes for the next phase

- Data currently lives in `src/data/sample-data.ts` and is read-only.
- No calculations are performed: balances and summary totals are hard-coded
  sample values.
- `next.config.ts` enables `cacheComponents` and `partialPrefetching`, so avoid
  non-deterministic values (like `new Date()`) during render. The footer caches
  the current year with the `"use cache"` directive as an example.
