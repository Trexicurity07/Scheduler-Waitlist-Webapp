# Spec: Client Accounts & Unified Apply Flow

**Date:** 2026-06-25
**Status:** Approved by project owner
**Supersedes:** Task 19 (public waitlist signup — anonymous flow) and Task 20 (per-entry email verification) are both reworked/retired by this spec.

---

## Overview

Every waitlist interaction — joining via a business's link or browsing the future marketplace — now requires a client account. This replaces the existing anonymous `/join/[slug]` form with an account-gated apply flow, adds a client-facing dashboard for managing entries and responding to slot offers, and retires Task 20's per-entry email verification in favour of a single account-level verification at signup.

Sub-projects explicitly deferred to follow-on specs (see section 8):
- **Spec 2:** Business profile editing + account deletion UI
- **Spec 3:** Marketplace / browse businesses
- **Spec 4:** Waitlist capacity caps

---

## 1. Architecture

Identity is now account-based, not email/phone fuzzy-matching. A `client_profiles` table holds one row per real person (platform-wide unique email + phone). The existing `clients` table becomes a thin per-business join keyed by `(business_id, user_id)` — a single unique constraint, no heuristic matching, no TOCTOU window.

This retires the "exact email+phone match → reuse / partial match → reject" logic added to `join-waitlist.ts` (commit `f6d12f3`) and the two unique indexes on `clients(business_id, email/phone)` added in `c8c51da`. The format validators in `src/lib/waitlist/validate-signup.ts` and `src/lib/auth/validate-password.ts` are kept and reused for client signup.

The cascade chain on account deletion is fully DB-backed, requiring no application-level cleanup:
`auth.users → client_profiles → clients → waitlist_entries → notifications`

---

## 2. Data Model Changes

### 2a. New table: `client_profiles`

```sql
create table client_profiles (
  user_id   uuid primary key references auth.users(id) on delete cascade,
  name      text        not null,
  email     text        not null unique,
  phone     text        not null unique,
  email_verification_token text,
  verified_at timestamptz,
  created_at  timestamptz not null default now()
);
alter table client_profiles enable row level security;
create policy "Clients can read their own profile"
  on client_profiles for select using (user_id = auth.uid());
create policy "Clients can update their own profile"
  on client_profiles for update using (user_id = auth.uid());
```

`email` and `phone` are unique platform-wide (not per-business). `verified_at` null means the account has not been verified yet; unverified accounts cannot log in.

### 2b. Alter `clients`

```sql
-- Drop per-client identity columns (now on client_profiles)
alter table clients drop column name;
alter table clients drop column email;
alter table clients drop column phone;

-- Link to account
alter table clients add column user_id uuid not null
  references client_profiles(user_id) on delete cascade;

-- Replace (business_id, email) + (business_id, phone) unique indexes
-- with the account-keyed constraint
drop index clients_business_id_email_idx;
drop index clients_business_id_phone_idx;
create unique index clients_business_id_user_id_idx on clients(business_id, user_id);
```

New RLS policies:
```sql
create policy "Clients can view their own client records"
  on clients for select
  using (user_id = auth.uid());
```

### 2c. Alter `businesses`

```sql
alter table businesses add column business_type text not null default '';
```

Required going forward at connect-setup. Existing test businesses get the empty-string default. Shown on the client dashboard alongside business name.
`whatsapp_number` is reused as "business contact" — no new contact column needed.

### 2d. Alter `waitlist_entries`

```sql
alter table waitlist_entries drop column email_verification_token;
alter table waitlist_entries drop column verified_at;
alter table waitlist_entries
  drop constraint waitlist_status_valid,
  add constraint waitlist_status_valid check (
    status in ('active', 'filled', 'expired', 'removed')
  );
```

`pending_verification` is retired. Entries created through the new apply flow are inserted with status `active` immediately (account email was already verified at signup). Task 17's cron housekeeping for `pending_verification` entries is removed.

---

## 3. Signup / Login / Verification Flow

### 3a. Signup

**Route:** `POST /api/client/signup`
**Page:** `src/app/client/signup/page.tsx`

Input: `{ name, email, phone, password }` — validated with existing `nameSchema`, `emailSchema`, `phoneSchema`, `passwordSchema`.

Logic (`src/lib/client-auth/signup-client.ts`):
1. Check `client_profiles` for existing email or phone — return `{ ok: false, error }` with a clear conflict message if either is taken.
2. `supabase.auth.admin.createUser({ email, password, email_confirm: false })` via service-role client.
3. Generate a verification token (`generateToken()`).
4. Insert `client_profiles` row with `user_id`, `name`, `email`, `phone`, `email_verification_token`.
5. Send verification email via Resend using the existing `sendVerificationEmail` template, linking to `/client/verify-email/[token]`.
6. Return `{ ok: true }` — session is NOT yet created. Client must verify first.

### 3b. Email verification

**Route:** `POST /api/client/verify-email`
**Page:** `src/app/client/verify-email/[token]/page.tsx`

Logic (`src/lib/client-auth/verify-client-email.ts`):
- Look up `client_profiles` by `email_verification_token`. If not found or already verified, return appropriate error.
- Set `verified_at = now()`, clear `email_verification_token`.
- Redirect to `/client/login` with a success message.

### 3c. Login

**Route:** `POST /api/client/login`
**Page:** `src/app/client/login/page.tsx`

Input: `{ identifier, password }` where `identifier` is email or phone.

Logic:
- If `identifier` passes `emailSchema`: use it directly as the email.
- If `identifier` passes `phoneSchema`: look up `client_profiles.email` by normalised phone via service-role client. Return `{ ok: false, error: 'No account found.' }` if no match.
- Check `client_profiles.verified_at` — if null, return `{ ok: false, error: 'Please verify your email before logging in.' }`.
- Call `supabase.auth.signInWithPassword({ email, password })`. On success, session cookie is set. Redirect to `?next` param if present, otherwise `/client/dashboard`.

### 3d. Session helper

`src/lib/client-auth/get-current-client.ts` — mirrors `getCurrentBusiness()`:
- Reads session user id from `createServerSupabaseClient()`.
- Joins to `client_profiles`. Redirects to `/client/login` if unauthenticated or `verified_at` is null.
- Returns `{ supabase, profile }`.

Middleware: extend existing `src/middleware.ts` to refresh sessions for `/client/*` routes (same `@supabase/ssr` cookie mechanics, new path prefix).

---

## 4. Apply Flow (Replaces Task 19)

`/join/[slug]` route behaviour changes:
- If not logged in → redirect to `/client/login?next=/join/[slug]`.
- If logged in → show the apply form. Name/email/phone are pre-filled from `client_profiles` (read-only). Client fills in preferred time windows only.

**Route:** `POST /api/client/apply/[slug]`

Logic (`src/lib/client-dashboard/apply-to-business.ts`):
```
applyToBusiness(supabase, userId, businessSlug, timeWindows):
  1. Look up business by slug. Return error if not found.
  2. Check for existing clients row (business_id, user_id).
     - If exists: check for an active waitlist_entries row.
       - If active entry exists: return { ok: false, error: 'You are already on the waitlist.' }
       - Otherwise: reuse existing clients row (clientId = existing row id).
     - If not exists: insert new clients row { business_id, user_id }. clientId = new row id.
  3. Insert waitlist_entries { business_id, client_id: clientId, time_windows, status: 'active',
     expires_at: now + 14 days }.
  4. Return { ok: true }.
```

No verification email. No token. No `pending_verification` status. Entry is immediately `active`.

Business-side "add client manually" (`addWaitlistEntry` in Task 23) is amended to require a matching `client_profiles` account: look up by email or phone; if no account exists, return `{ ok: false, error: 'No client account found for this email or phone. The client must sign up first.' }`. If found, use the `user_id` to find-or-create the `clients` row and insert the entry.

---

## 5. Client Dashboard

**Page:** `src/app/client/dashboard/page.tsx`

Three sections, all populated server-side via `getMyEntries`, `getMyOffers`, `getPastEntries`:

### 5a. Active waitlist entries

Each entry shows: business name, `business_type`, WhatsApp link (contact), requested time windows, status, expiry date.

Actions per entry:
- **Edit** — inline time-window form. `PATCH /api/client/entries/[id]`. Only available while status is `active`.
- **Cancel** — `DELETE /api/client/entries/[id]`. Sets status → `removed`. Client is prompted to confirm before sending.

### 5b. Pending slot offers

`notifications` rows with `type = 'slot_offer'` and `status = 'sent'` for the client's entries.

Each offer shows: business name, appointment slot (date/time), offer expiry.

Actions:
- **Confirm** / **Decline** — call the same `confirmOffer` / `declineOffer` functions Task 21 builds. Email-link confirm/decline routes continue to work unchanged (no login required to action an offer via the email link — this is an additive dashboard surface, not a replacement of the token-link mechanism).

### 5c. Past entries

`waitlist_entries` with status in `('filled', 'expired', 'removed')`, capped at the 20 most recent. Read-only. Shows business name, status, and dates.

---

## 6. Pure Logic Layer

All functions in `src/lib/client-auth/` and `src/lib/client-dashboard/` are zero-I/O where possible, Supabase-client-injected, and integration-tested against local Supabase (TDD — tests written first per CLAUDE.md).

| File | Exports |
|---|---|
| `src/lib/client-auth/signup-client.ts` | `signupClient(supabase, input)` |
| `src/lib/client-auth/verify-client-email.ts` | `verifyClientEmail(supabase, token)` |
| `src/lib/client-auth/get-current-client.ts` | `getCurrentClient()` |
| `src/lib/client-dashboard/apply-to-business.ts` | `applyToBusiness(supabase, userId, slug, timeWindows)` |
| `src/lib/client-dashboard/manage-own-entries.ts` | `getMyEntries`, `getMyOffers`, `getPastEntries`, `editPendingEntry`, `removeOwnEntry` |

Routes (`src/app/api/client/`) are thin parse/auth/delegate — no automated tests per CLAUDE.md, manual walkthrough on completion.

---

## 7. Cron Simplification

`src/lib/cron/waitlist-housekeeping.ts` currently has a branch that deletes unverified (`pending_verification`) entries older than 48 hours. This branch is removed. The `expireWaitlistEntries` path (14-day expiry of `active` entries) is unchanged.

---

## 8. Out of Scope (Deferred Specs)

| Spec | Description |
|---|---|
| **Spec 2** | Business profile editing (name, type, contact) + business account deletion via owner dashboard |
| **Spec 3** | Marketplace: browse businesses by name/type/location, apply directly (uses this spec's account + apply flow) |
| **Spec 4** | Waitlist capacity caps: platform min/max, business-settable max within range, overflow truncation + email notice |

Business location field is deferred to Spec 3 (its first real consumer).

---

## 9. Migration Summary

Three migration files (to be applied in order):
1. Add `client_profiles` table + RLS policies.
2. Alter `clients` (drop name/email/phone, add user_id, replace unique indexes), alter `waitlist_entries` (drop verification columns, update status constraint), alter `businesses` (add business_type).
3. Remove the two unique indexes on `clients(business_id, email/phone)` added in migration `0003` (superseded by `unique(business_id, user_id)`).

> **Note:** This is a breaking schema change. All existing `clients` rows (created by the now-retired anonymous join flow) must be handled in the migration — since this is pre-launch with no real production data, the migration can truncate `clients` and `waitlist_entries` cleanly rather than attempting a backfill. The migration should `truncate clients, waitlist_entries cascade` before applying the schema changes.
