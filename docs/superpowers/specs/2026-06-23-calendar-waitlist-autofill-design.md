# Design: Google Calendar Cancellation Waitlist Auto-Fill (Phase 1)

**Status:** Approved for planning
**Date:** 2026-06-23

## 1. Problem & Scope

Appointment-based SMBs (groomers, trainers, cleaners, salons, coaches — solo/tiny teams, non-technical, English-speaking markets) lose revenue when a client cancels and the slot sits empty. This product detects cancellations in a business's Google Calendar and automatically offers the freed slot to clients on a waitlist, via email and a WhatsApp deep link, with zero ongoing infrastructure cost.

**Phase 1 scope:** Google Calendar only. The integration layer is built behind a provider interface so a second calendar provider (Acuity, Setmore, Square, Calendly, ...) can be added later without rewriting matching/notification logic. No AI/LLM features — pure scheduling logic and automation. No payment provider integration this phase (see §7).

**Out of scope for Phase 1:** WhatsApp Business API (sending/receiving programmatically), Google Calendar push webhooks, automated browser E2E testing, multi-provider calendar support (beyond the seam), paid SMS sending.

## 2. Tech Stack

- Language: TypeScript (strict mode)
- Framework: Next.js (App Router), Node.js runtime
- Database + Auth: Supabase (Postgres, free tier)
- Hosting: Vercel (free/Hobby tier)
- Email: Resend (free tier, 3k/mo)
- Notifications: email (Resend) + `wa.me` WhatsApp deep links (client-initiated only — see §6)
- Cron trigger: **external free scheduler** (e.g. cron-job.org, GitHub Actions schedule, or Upstash QStash free tier) calling a Vercel API route every 5 minutes — **not** Vercel's native Cron Jobs feature

## 3. Architecture Overview

```
External scheduler (every 5 min)
        │  HTTPS GET (shared secret)
        ▼
Vercel API route: /api/cron/poll
        │
        ├─ claims unclaimed businesses (processing_started_at lock, stale after ~4 min)
        │
        ├─ for each claimed business:
        │     CalendarProvider.listChangedEvents(since: last_checked_at)  ──► Google Calendar API
        │     (dedicated client-bookings calendar only)
        │
        ├─ resolve any pending offers whose slot was retaken externally → mark superseded, notify batch
        ├─ cancelled event found, ≥ min_notice_hours away? → match against active waitlist_entries
        ├─ notify next batch (email + wa.me link, signed confirm/decline token)
        ├─ expire waitlist_entries past 14 days (email client)
        ├─ expire never-verified signups past 48h
        └─ release lock, update last_checked_at

Client clicks confirm/decline → /confirm/[token]
        → validate token + re-check slot still open + check ≥ min_confirm_lead_hours away
        → confirm: CalendarProvider.createEvent() (plain event, no attendee), mark entry filled, supersede siblings
        → decline: mark declined immediately, no need to wait out the batch timeout

Business owner ──OAuth once──► Google consent ──► pick existing or create new dedicated bookings calendar
Business owner ──► Dashboard: upcoming appointments, waitlist (view/add/remove/configure), notification history
Public client ──► /join/[business-slug] waitlist form (no login) ──► email verification link ──► /verify-email/[token]
```

This is entirely Vercel serverless functions + Supabase Postgres — no long-running workers, no separate infrastructure. The external scheduler is the only piece we don't host ourselves.

**No webhooks in Phase 1.** Google's push notifications carry no event data (just a "something changed, go sync" ping) and aren't guaranteed to be delivered — polling remains necessary as a fallback even with webhooks, so they add a registration/renewal/validation surface without removing anything. The worst case of pure polling is a bounded, self-healing detection delay (~5–10 minutes via incremental sync on `last_checked_at`), never a missed cancellation — small relative to the 30-minute default batch window. Webhooks are a candidate latency optimization for a later phase.

## 4. Core Flow

1. **Trigger**: external scheduler hits `POST /api/cron/poll` every 5 min with a shared secret.
2. **Claim**: route claims businesses where `processing_started_at` is null or stale (>4 min), setting it to now — prevents two overlapping runs double-processing one business.
3. **Poll**: `CalendarProvider.listChangedEvents(since: last_checked_at)` against the business's dedicated bookings calendar only (never their personal/primary calendar).
4. **Detect cancellation**: any event flipped to `cancelled` since last check → look up the cached `appointments` row, mark freed.
5. **Resolve stale offers first**: if any slot with a pending offer was retaken (owner rebooked manually, or filled another way), mark those notifications `superseded` and tell the affected batch "this one's gone" — even if it wasn't filled through our system.
6. **Eligibility check**: slot only proceeds if `(slot.start - now) >= business.min_notice_hours` (default 24h, configurable).
7. **Match**: active, verified `waitlist_entries` whose day/time-of-day window covers the slot, ordered by longest-waiting first.
8. **Notify batch**: send the next `batch_size` (default 3, configurable) unnotified matches an email + `wa.me` link, each with a unique signed token valid for `batch_interval_minutes` (default 30, configurable) — but only if `(slot.start - now) >= business.min_confirm_lead_hours` (default 12h, configurable); otherwise stop sending new batches for that slot entirely, since no one could act in time.
9. **Client responds** at `/confirm/[token]`:
   - **Decline**: immediately marks that notification declined — doesn't wait out the batch timeout.
   - **Confirm**: re-verify the slot is still open and `(slot.start - now) >= min_confirm_lead_hours`; if someone beat them to it or the window's closed, show the appropriate "no longer available" message. Otherwise `CalendarProvider.createEvent()` (plain event, no attendee — see §6), mark the waitlist entry `filled`, mark sibling notifications in that batch `superseded`.
   - **Confirmation form** shows full slot details (date, time, location/business info) and asks the client to confirm it works for them — this is the de facto duration/service-fit check (see §5).
10. **Timeout, no response**: after `batch_interval_minutes`, remaining `sent` notifications flip to `expired`; next batch goes out for the same slot if still unfilled (repeat step 8, respecting the confirm-lead-hours cutoff).
11. **Housekeeping** (same cron pass): expire `waitlist_entries` past 14 days (email the client); expire `pending_verification` entries that never confirmed their email past 48 hours (no notification — they never verified, so no claim to a notice).

## 5. Matching: What "Time Preference" Means

A waitlist entry captures a **recurring weekly pattern**: one or more day-of-week + time-of-day windows (e.g. "Tuesdays & Thursdays, mornings" or "any weekday after 5pm") — not a specific date range. One active entry per client per business; multiple windows live inside that single entry rather than as separate rows.

**Matching is day/time-of-day only** — duration and service type are deliberately ignored at the matching stage to keep scope lean. Instead, the confirmation step (§4 step 9) shows the actual slot details and asks the client to confirm it fits, which catches duration/service mismatches without needing a services table or duration-aware matching logic this phase.

## 6. Notifications

- **Channels**: email (Resend) for everything; `wa.me` deep link included alongside email for slot offers (client-initiated chat with the business, prefilled message) and for owner-triggered activity notices.
- **No paid SMS.** Phone numbers are collected but not OTP-verified (see §8) — there is no sustained free SMS-sending option, and WhatsApp can't be used to push messages without the WhatsApp Business API, which stays deferred per the original spec.
- **Replacement appointment event**: created as a plain Google Calendar event (client name/phone/email in the description) — **no attendee invite**. The client's confirmation/details come entirely through our own email + WhatsApp link, not a native Calendar invite.
- **Owner activity notices**: manual add or manual remove by the business owner triggers an email + `wa.me` link to the affected client.
- **Notification log** (`notifications` table) records every send with a `type` (slot_offer / owner_added / owner_removed / expiry / email_verification), `channel`, `status`, and the signed `token` used in confirm/decline or verification links.

## 7. Monetization Seam

**Discarded for Phase 1** — no tiers, no slot cap, no `tier` column. Originally scoped as "free tier = 5 slots, paid = $19/mo unlimited," but adding this later is a small, isolated change (a `tier` column on `businesses` defaulting to `'free'`, plus a single `canAddWaitlistEntry(businessId)` check gating waitlist-entry creation) — it doesn't touch matching, notification, or calendar logic, so deferring it costs nothing structurally.

## 8. Waitlist Signup & Verification

- **Public form** at `/join/[business-slug]`, no login required. Requires name, **email**, and **mobile number** (both required). The form discloses the 14-day expiry window upfront.
- **Duplicate prevention**: a new signup is rejected if either the email or the phone number already has an *active* entry at that business.
- **Email verification (not phone)**: self-service signups start as `pending_verification`. A verification email (Resend) is sent immediately; clicking the link lands on `/verify-email/[token]`, a simple result page — success ("you're on the waitlist for [Business]") or failure with a specific reason (link expired, already used, or invalid). Entries that never verify auto-remove after 48 hours (no notification sent — they never confirmed an email to notify).
- **Phone number** (the client's) is collected and used for the duplicate check, but is **not** OTP-verified (see §6 — no zero-cost SMS path exists; flipped verification to email instead). It is not the number used to build `wa.me` links — see the gap fix in §10 regarding the business's own WhatsApp number.
- **Owner-added entries** (business manually adds a client, e.g. after a phone call) skip verification entirely and start directly as `active`.
- **Entry statuses**: `pending_verification` → `active` → (`filled` | `expired` | `removed`).

## 9. Time Windows: Notice & Confirmation Lead Time

Two independent, per-business-configurable thresholds on `businesses`:

- **`min_notice_hours`** (default 24): a freed slot only enters the matching/notification pipeline if its start time is at least this far in the future. Filters out cancellations too last-minute to realistically fill.
- **`min_confirm_lead_hours`** (default 12): a client may only confirm if doing so is at least this far before the appointment. Checked both before sending a new batch round and again when a client clicks confirm.
- **Validation rule**: the dashboard must enforce `min_confirm_lead_hours < min_notice_hours` — otherwise there's no time window in which any batch round could realistically run.

## 10. Calendar Integration

- **Onboarding**: owner connects Google via OAuth once, then either picks an existing calendar or creates a new one, specifically for client bookings — this dedicated calendar is the *only* one ever polled or written to, separating client appointments from personal/blocked-time events without heuristics or tagging conventions.
- **Gap fix (self-review)**: `wa.me` links always target a specific phone number — the one the chat opens *to*. For slot-offer and activity notifications, that's the **business's own** WhatsApp-reachable number, not the client's, and Google OAuth never supplies it. Onboarding must collect it as a plain form field (`businesses.whatsapp_number`) alongside the calendar setup step.
- **Multi-provider seam**: a `CalendarProvider` interface (`listChangedEvents`, `createEvent`, `getCalendarTimezone`, ...) is the only thing matching/notification/cron code talks to. `GoogleCalendarProvider` is the sole Phase 1 implementation; each business stores `calendar_provider: 'google'`. Adding a second provider later means writing a new adapter, not touching the core flow.
- **Timezone**: read from the dedicated calendar's `timeZone` setting at connect time, cached on the business row. Day/time-of-day windows are interpreted in that timezone; timestamps are stored as UTC instants.
- **OAuth revoked/expired**: any Calendar API call returning `invalid_grant`/401 marks the business `calendar_status = 'disconnected'`, halts polling for them, emails the owner a reconnect link, and shows a dashboard banner.
- **Quota**: incremental sync (`updatedMin = last_checked_at`) keeps each poll cheap; Google's default quota comfortably covers dozens-to-hundreds of businesses on a 5-min loop. A 429 on one business backs off and retries next cycle without blocking others.

## 11. Data Model (Conceptual)

Exact column lists/types are pinned together immediately before writing migrations (the user has the authoritative list). Conceptually:

- **`businesses`** — owner identity, OAuth state (`google_refresh_token` encrypted), `dedicated_calendar_id`, `calendar_provider`, `timezone`, `calendar_status`, `last_checked_at`, `processing_started_at` (cron lock), `batch_size`, `batch_interval_minutes`, `min_notice_hours`, `min_confirm_lead_hours`, `public_slug`, `whatsapp_number` (the business's own, used as the `wa.me` link target).
- **`clients`** — scoped per business (no cross-business identity): name, email, phone.
- **`waitlist_entries`** — one active entry per client per business: day-of-week + time-of-day window(s), `status` (`pending_verification`/`active`/`filled`/`expired`/`removed`), `email_verification_token`, `verified_at`, `created_at`, `expires_at`, `notified_at`/`batch_number`.
- **`appointments`** — read-through cache of the dedicated calendar's events (not source of truth): `google_event_id`, start/end, `status`, `synced_at`. Used to detect cancellations and to re-check "is this slot still open."
- **`notifications`** — append-only send log: `waitlist_entry_id`, `appointment_id`, `type`, `channel`, `status`, `token`, `sent_at`, `batch_number`.

## 12. Secrets & Encryption

- `google_refresh_token` encrypted at rest with application-level AES-256-GCM; key lives in a Vercel environment variable, never in the database. Encrypt/decrypt only happens in server-side code (cron routes, API routes using the service-role Supabase client) — never logged, never sent to the client.
- `.env.example` with placeholder keys and `.gitignore` (covering `.env`, `node_modules`, `.next`, etc.) are set up before any real credentials exist.

## 13. Folder Structure

```
/
├── .env.example
├── .gitignore
├── CLAUDE.md
├── supabase/migrations/
├── docs/superpowers/specs/
├── src/
│   ├── app/
│   │   ├── (dashboard)/{dashboard,waitlist,notifications}/page.tsx
│   │   ├── connect/                       OAuth + calendar picker
│   │   ├── join/[slug]/page.tsx           public waitlist signup
│   │   ├── verify-email/[token]/page.tsx  verification result page
│   │   ├── confirm/[token]/page.tsx       public confirm/decline page
│   │   └── api/
│   │       ├── cron/poll/route.ts
│   │       ├── oauth/google/callback/route.ts
│   │       ├── waitlist/route.ts
│   │       └── confirm/[token]/route.ts
│   ├── lib/
│   │   ├── calendar/{provider.ts,google-provider.ts}
│   │   ├── matching/match-waitlist.ts      pure function, zero I/O
│   │   ├── notifications/{email.ts,whatsapp.ts}
│   │   ├── crypto/encrypt.ts
│   │   ├── cron/poll-businesses.ts
│   │   └── db/supabase.ts
│   └── types/
```

`app/api/*` routes stay thin (auth/parsing, then delegate); `lib/matching` has zero I/O so it's trivial to TDD; `lib/calendar/provider.ts` is the only place that knows "Google" exists. Tests are co-located next to source (`match-waitlist.test.ts` beside `match-waitlist.ts`).

## 14. Testing Strategy (TDD)

Tests are written before implementation throughout, using Vitest.

- **Unit** (bulk of the suite, zero I/O): day/time-window matching including midnight-spanning windows and DST; "longest waiting first" ordering; encrypt/decrypt round-trip and tamper detection; confirm/decline/verification token generation and validation (expiry, single-use, wrong-token rejection); batch-state transitions as a pure state machine.
- **Integration**: API routes and `poll-businesses.ts` against a local Supabase instance with a **fake `CalendarProvider`** (scripted responses — cancelled event, no changes, rate-limited) — never the live Google API. Covers: cron lock behavior, confirm-route race (second confirm must lose), signup duplicate-rejection, notice/confirm-lead-hours gating.
- **Manual/E2E**: no automated browser tests this phase. Each feature gets a manual walkthrough (connect flow, join-waitlist form, email verification, confirm/decline page) before being called done.

## 15. Key Decisions Log (for future reference)

- Vercel Hobby cron caps at once/day → 5-min polling driven by an external free scheduler instead.
- Appointments are created by the owner directly in Google Calendar (via phone/walk-in/other tools); our app never originates a normal booking, only the replacement booking after a cancellation.
- Webhooks dropped entirely for Phase 1 — see §3.
- Monetization tiers dropped entirely for Phase 1 — see §7.
- Phone OTP verification dropped (no zero-cost SMS or WhatsApp-push path exists without building WhatsApp Business API early); verification flipped to email.
