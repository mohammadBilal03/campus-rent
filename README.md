# campus-rent

A campus rental and marketplace web app. Students sign in with their university email, post items to rent or sell, request bookings, and chat.

Stack: Next.js 15 (App Router) + Tailwind 4, Supabase (Postgres, Auth, Storage, Realtime), Vercel. Free tiers only.

## What works today

| Area | Features |
|---|---|
| Identity | Email signup with verification, university-domain check (client and database), login, logout, protected routes |
| Catalog | Post item with photo (compressed in the browser), browse, filters, full-text search, item page, pause, sell or remove listings |
| Transactions | Rent request with date range, availability shown, owner approve or reject, handover and return, cancel, database-enforced no double booking |
| Engagement | Per-item chat with live updates |

Not built yet (next tasks): buy offers and orders, reviews, report and admin page, email notifications, PWA install, Sentry, pagination beyond the first 24 items, several photos per item.

## Folder map (who owns what)

| Member | Module | Code | SQL |
|---|---|---|---|
| A | Identity and platform | `src/lib/supabase`, `src/middleware.ts`, `src/app/login`, `src/app/auth`, `src/components/Navbar.tsx`, `.github` | `0001_identity.sql` |
| B | Catalog | `src/app/page.tsx`, `src/app/items/new`, `src/app/my/listings`, `src/components/ItemCard.tsx` | `0002_catalog.sql` |
| C | Transactions | `src/app/items/[id]`, `src/app/my/bookings` | `0003_transactions.sql` |
| D | Engagement | `src/app/chat` | `0004_engagement.sql` |

Shared: `src/lib/contracts.ts` (validation and enums), `src/lib/types.ts`, `src/lib/format.ts`. Changes there need all four approvals.

## 1. Set up Supabase (10 minutes)

1. Create a project at supabase.com. Save the database password.
2. Open `supabase/migrations/0001_identity.sql` and change `@youruni.edu` to your real university domain. (For solo testing, use a domain you can receive email on.)
3. In Supabase, open SQL Editor and run the four files in order: `0001`, `0002`, `0003`, `0004`. Each should say "Success".
4. Authentication, URL Configuration: set Site URL to `http://localhost:3000` for now, and add `http://localhost:3000/**` to Redirect URLs. After deploying, also add your Vercel URL and `/**`.
5. Project Settings, API: copy the Project URL and the anon (or publishable) key.

## 2. Run it on your laptop

```bash
npm install
cp .env.example .env.local     # then fill in the three values
npm run dev
```

Open http://localhost:3000, create an account with your university email, click the link in the verification email, then sign in.

Using the Supabase CLI with Docker instead? `npx supabase init`, then `npx supabase start`, then `npx supabase db reset` applies the migrations in `supabase/migrations`.

## 3. Put it on GitHub

```bash
git init
git add .
git commit -m "feat: initial campus-rent MVP"
git branch -M main
git remote add origin https://github.com/<you>/campus-rent.git
git push -u origin main
```

Add teammates under Settings, Collaborators. Turn on branch protection for `main` (pull request required, CI must pass). Edit `.github/CODEOWNERS` with real usernames.

## 4. Deploy on Vercel

1. vercel.com, Add New, Project, import the repo.
2. Add the three environment variables from `.env.local` (Settings, Environment Variables).
3. Deploy. Then add the Vercel URL to Supabase Authentication, URL Configuration (Site URL and Redirect URLs with `/**`).

Every push to `main` now deploys automatically. Other branches get preview URLs.

## Before you invite real students

- Supabase's built-in email sender has very low hourly limits. Set up custom SMTP (Resend or Brevo free tier) under Authentication settings.
- Check the current free-tier limits and the Vercel Hobby terms on their pricing pages.
- Try to break it: edit another user's listing or booking from the browser console. RLS should refuse.
- Never put the `service_role` key in the frontend or in GitHub.
- Make yourself admin if needed (no admin page yet): `update profiles set role = 'admin' where id = '<your user id>';`

## How the database protects you

- Row Level Security is on for every table, default deny.
- `bookings` has an exclusion constraint, so two approved or active bookings for the same item can never overlap. The app shows a friendly message when it triggers.
- Booking owner, status and prices are set by a database trigger, not by the browser. Status changes are limited to the allowed moves for the right person.
- Photos can only be uploaded into your own folder in the `item-images` bucket.

## Troubleshooting

- Page loads but lists are empty: confirm you ran all four SQL files, and that you are signed in.
- "Invalid API key" or fetch errors: check `.env.local`, then restart `npm run dev`.
- Verification link goes to the wrong place: fix Site URL and Redirect URLs in Supabase.
- Works locally but not on Vercel: environment variables are missing there. Redeploy after adding them.
- Signup says only `@youruni.edu` allowed: you did not change the domain in `0001_identity.sql`.
