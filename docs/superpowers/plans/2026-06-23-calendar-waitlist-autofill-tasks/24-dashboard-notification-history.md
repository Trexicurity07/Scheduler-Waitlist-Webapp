### Task 24: Dashboard — Notification History

> ────────────────────────────────────────────────────────────────
> ## ⚠️ SCHEMA AMENDMENT — READ BEFORE IMPLEMENTING
>
> **Reason:** Task 25 migrates `clients` to drop `name`/`email`/`phone` columns. Client
> name now lives in `client_profiles` (joined through `clients`). Apply both changes below.
>
> **Change 1 — `.select(...)` query (Step 1, line `select(...)`):**
>
> Replace:
> ```ts
> .select('id, type, status, sent_at, responded_at, waitlist_entries!inner(business_id, clients(name, email))')
> ```
> With:
> ```ts
> .select('id, type, status, sent_at, responded_at, waitlist_entries!inner(business_id, clients(client_profiles(name, email)))')
> ```
>
> **Change 2 — client name display in table row:**
>
> Replace:
> ```tsx
> <td>{notification.waitlist_entries?.clients?.name ?? '—'}</td>
> ```
> With:
> ```tsx
> <td>
>   {(notification.waitlist_entries?.clients as { client_profiles?: { name?: string } } | null)
>     ?.client_profiles?.name ?? '—'}
> </td>
> ```
>
> **Note — `email_verification` notification type:** Task 27 retires per-entry email
> verification, so no new `email_verification` notifications will be created going forward.
> Keep the `TYPE_LABELS` entry — it is harmless and may appear in historical test data.
> ────────────────────────────────────────────────────────────────

**Files:**
- Create: `src/app/(dashboard)/notifications/page.tsx`

**Interfaces:**
- Consumes: `getCurrentBusiness()` (Task 22).
- Produces: nothing — this is the last dashboard page in this plan; nothing later consumes it.

This task has no Vitest test step: it's a read-only page rendering already-tested data (the `notifications` table, written to throughout Tasks 9-21) through the already-tested `getCurrentBusiness()` helper, in line with this plan's pattern of validating thin page-level glue via manual walkthrough rather than unit tests (see Task 11/12, Task 22).

- [ ] **Step 1: Implement the notification history page**

`src/app/(dashboard)/notifications/page.tsx`:

```tsx
import { getCurrentBusiness } from '@/lib/dashboard/get-current-business'

const TYPE_LABELS: Record<string, string> = {
  slot_offer: 'Slot offer',
  owner_added: 'Added by you',
  owner_removed: 'Removed by you',
  expiry: 'Waitlist expiry',
  email_verification: 'Email verification',
}

const STATUS_LABELS: Record<string, string> = {
  sent: 'Sent',
  confirmed: 'Confirmed',
  declined: 'Declined',
  expired: 'Expired',
  superseded: 'Superseded',
}

export default async function NotificationsPage() {
  const { supabase, business } = await getCurrentBusiness()

  const { data: notifications } = await supabase
    .from('notifications')
    .select('id, type, status, sent_at, responded_at, waitlist_entries!inner(business_id, clients(name, email))')
    .eq('waitlist_entries.business_id', business.id)
    .order('sent_at', { ascending: false })
    .limit(50)

  return (
    <main>
      <h1>Notification history — {business.name}</h1>
      {!notifications || notifications.length === 0 ? (
        <p>No notifications sent yet.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Client</th>
              <th>Type</th>
              <th>Status</th>
              <th>Sent</th>
              <th>Responded</th>
            </tr>
          </thead>
          <tbody>
            {notifications.map((notification) => (
              <tr key={notification.id}>
                <td>{notification.waitlist_entries?.clients?.name ?? '—'}</td>
                <td>{TYPE_LABELS[notification.type] ?? notification.type}</td>
                <td>{STATUS_LABELS[notification.status] ?? notification.status}</td>
                <td>{new Date(notification.sent_at).toLocaleString()}</td>
                <td>{notification.responded_at ? new Date(notification.responded_at).toLocaleString() : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  )
}
```

- [ ] **Step 2: Manual walkthrough**

With `supabase start` and `npm run dev` running and a logged-in owner: in Supabase Studio, insert a few `notifications` rows against that business's existing waitlist entries/clients, varying `type` and `status` and leaving `responded_at` null on some. Visit `/notifications` and confirm: rows render newest-first by `sent_at`, friendly labels appear for type/status, and rows with no `responded_at` show "—". Then insert one more `notifications` row tied to a *different* business's waitlist entry/client, reload, and confirm it does not appear in the list.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(dashboard)/notifications"
git commit -m "feat: add dashboard notification history page"
```

---
