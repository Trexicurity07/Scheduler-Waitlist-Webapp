### Task 29: Remove Dead `removeUnverifiedSignups` Cron Branch

> ⚠️ **THIS TASK AMENDS COMPLETED TASK 17.**
>
> Task 17 built `src/lib/cron/waitlist-housekeeping.ts` which has two exported functions: `expireWaitlistEntries` (still needed) and `removeUnverifiedSignups` (now dead code). The `pending_verification` status was removed from the `waitlist_entries` status constraint in **Task 25's migration 0005**. Task 25 also already deleted the tests for `removeUnverifiedSignups`. This task removes the dead code from the implementation file and updates the cron orchestrator that calls it.
>
> The integration test that covered `removeUnverifiedSignups` was already removed in Task 25's rewrite of `waitlist-housekeeping.test.ts`. No test changes are needed here.

**Files:**
- Modify: `src/lib/cron/waitlist-housekeeping.ts` (delete `removeUnverifiedSignups` function and its export)
- Modify: the cron orchestrator that calls `removeUnverifiedSignups` — find it by searching for the call site (likely `src/lib/cron/run-housekeeping.ts`, `src/app/api/cron/housekeeping/route.ts`, or similar — search the codebase for `removeUnverifiedSignups`)

**Interfaces:**
- `removeUnverifiedSignups` is removed entirely. Nothing should call it after this task.
- `expireWaitlistEntries` is unchanged.

---

- [ ] **Step 1: Find all call sites for `removeUnverifiedSignups`**

Search the codebase for `removeUnverifiedSignups`:

```bash
grep -r "removeUnverifiedSignups" src/
```

Note every file that imports or calls it. There should be exactly two: `waitlist-housekeeping.ts` (the definition) and whatever orchestrator or cron route calls it. If there are more, update all of them.

- [ ] **Step 2: Remove `removeUnverifiedSignups` from `src/lib/cron/waitlist-housekeeping.ts`**

Open `waitlist-housekeeping.ts`. Delete the entire `removeUnverifiedSignups` function body and its export statement. Keep `expireWaitlistEntries` exactly as-is.

Before the edit the file should have something like:

```ts
export async function removeUnverifiedSignups(
  supabase: SupabaseClient<Database>,
  business: ClaimedBusiness,
  now: Date
): Promise<void> {
  // ... (48-hour unverified entry deletion logic)
}
```

Delete that entire function. Also remove it from any barrel export if it appears in one.

- [ ] **Step 3: Remove the call from the cron orchestrator**

In each call site found in Step 1 (other than the definition file), remove:
- The import of `removeUnverifiedSignups`.
- The call to `removeUnverifiedSignups(...)`.

Do not remove the `expireWaitlistEntries` call or import — that function is still active.

- [ ] **Step 4: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: 0 errors. (No remaining references to `removeUnverifiedSignups`.)

- [ ] **Step 5: Run full test suite**

Run: `npx vitest run`
Expected: all tests pass (the `removeUnverifiedSignups` tests were already removed in Task 25 — no test failures expected from their absence).

- [ ] **Step 6: Commit**

```bash
git add src/lib/cron/waitlist-housekeeping.ts
# also stage the orchestrator file(s) found in Step 1
git commit -m "chore: remove dead removeUnverifiedSignups cron branch (pending_verification status retired)"
```

---
