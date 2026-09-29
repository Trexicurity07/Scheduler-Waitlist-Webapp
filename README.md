# Scheduler Waitlist

> Automatically fills calendar cancellations from a waitlist — detect, match, offer, confirm.

[Live Demo](https://your-deployment.vercel.app) &nbsp;|&nbsp; Demo login: `demo@schedulerwaitlist.com` / `Demo1234!`

---

## Features

- **Interval-overlap matching** — waitlist time windows are matched to freed slots using a compound Supabase filter (`.lt('start_time', end_time).gt('end_time', start_time)`), ensuring only clients whose availability genuinely overlaps the cancellation are contacted
- **Race-condition-safe confirmations** — single-use tokens with a `UNIQUE` constraint; the confirm handler uses a CAS update (`.eq('status', 'cancelled')`) so only the first responder wins the slot
- **AES-256-GCM token encryption** — Google OAuth refresh tokens are encrypted at rest; the plaintext never leaves the decrypt-to-use boundary in `src/lib/crypto/encrypt.ts`
- **Row Level Security on all 5 tables** — owners can only read/write their own businesses, clients, appointments, waitlist entries, and notifications
- **Vercel Cron every 5 minutes** — syncs Google Calendar, detects new cancellations, resolves stale offers, dispatches batched email offers, and expires timed-out entries
- **Keep-alive endpoint** — pings Supabase every 72 hours so the free-tier project never pauses
- Business owner dashboard — manage locations, waitlists, and entries
- Client portal — join waitlists, set time-window preferences, confirm/decline slot offers via email link
- Public business directory with per-business join pages

---

## Tech Stack

| Layer | Technologies |
|---|---|
| Frontend | Next.js 16 App Router, React 19, TypeScript strict mode |
| Styling | Tailwind CSS v4, Radix UI primitives (shadcn/ui), Inter font |
| Backend | Next.js Route Handlers (Node runtime), Zod validation |
| Database | Supabase (PostgreSQL), Row Level Security, `@supabase/ssr` |
| Auth | Supabase Auth (email/password + Google OAuth) |
| Calendar | Google Calendar API via `googleapis` |
| Email | Resend |
| Crypto | Node.js `crypto` — AES-256-GCM |
| Infra | Vercel (cron + hosting), Supabase free tier |
| Testing | Vitest |

---

## Architecture

Every 5 minutes, Vercel invokes `POST /api/cron/poll`. The handler iterates each connected business and runs a pipeline: **sync** (fetch Google Calendar events and diff against the DB to detect new cancellations) → **resolve stale offers** (expire any pending notifications for slots that are no longer available) → **dispatch batch** (find active waitlist entries whose time windows overlap the freed slot, send up to `batch_size` email offers with single-use tokens) → **expire** (mark timed-out entries and unfilled offers). When a client clicks their confirmation link, a CAS update claims the slot atomically; concurrent requests for the same slot get a graceful "already filled" response.

---

## Getting Started

**Prerequisites:** Node.js 18+, a Supabase project, a Google Cloud project with Calendar API enabled.

```bash
git clone https://github.com/Trexicurity07/Scheduler-Waitlist-Webapp.git
cd Scheduler-Waitlist-Webapp
npm install
```

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

Apply the database schema:

```bash
# with Supabase CLI
supabase db push
# or paste supabase/migrations/0001_init.sql into the Supabase SQL editor
```

```bash
npm run dev   # http://localhost:3000
```

---

## Demo Account

| Field | Value |
|---|---|
| Email | `demo@schedulerwaitlist.com` |
| Password | `Demo1234!` |

The demo account has a pre-seeded business ("Demo Wellness Studio"). Google Calendar sync is disabled for the demo (`calendar_status: 'disconnected'`), so no live OAuth is required. To seed the demo account against your own Supabase instance: `npm run seed:demo`.

---

## Database Schema

Full schema with RLS policies: [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) — five tables: `businesses`, `clients`, `appointments`, `waitlist_entries`, `notifications`.

---

## Project Structure

```
src/
  app/                  # Next.js App Router pages and API routes
    (dashboard)/        # Owner dashboard (protected)
    client/             # Client portal
    api/cron/           # Cron endpoint
    api/health/         # Keep-alive endpoint
  lib/
    cron/               # Sync, dispatch, expiry logic
    confirm/            # Token verification, CAS confirm
    crypto/             # AES-256-GCM encrypt/decrypt
    db/                 # Supabase client helpers
  components/
    ui/                 # shadcn/ui primitives
supabase/
  migrations/           # SQL schema
scripts/
  seed-demo.ts          # Seed demo account
```

---

## Deployment

**Vercel:** Fork this repo, create a new Vercel project pointing at it, and add all variables from `.env.example` to the Vercel environment. Cron jobs are configured in `vercel.json` and activate automatically on Vercel's Hobby tier.

**Supabase:** Create a free project at supabase.com, run `supabase/migrations/0001_init.sql` in the SQL editor, then copy the project URL and keys into your Vercel environment variables. The `/api/health` cron pings the database every 72 hours to prevent free-tier pausing.
