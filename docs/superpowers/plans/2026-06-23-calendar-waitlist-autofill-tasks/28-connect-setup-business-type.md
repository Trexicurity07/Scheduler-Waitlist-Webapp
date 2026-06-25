### Task 28: Add `business_type` to Connect-Setup

> ⚠️ **THIS TASK AMENDS COMPLETED TASKS 11 AND 12.**
>
> Task 11 built the connect-setup business logic (`src/lib/connect/connect-setup.ts`) and Task 12 built the connect-setup UI (`src/app/connect/setup/page.tsx` and `src/app/api/connect/setup/route.ts`). Both are already committed. This task adds a `business_type` field to those completed files. Do NOT rebuild them from scratch — make targeted additions only.
>
> The `business_type` column was added to the `businesses` table in **Task 25's migration 0006** (`alter table businesses add column business_type text not null default ''`). No migration is needed here.

**Files:**
- Modify: `src/lib/connect/connect-setup.ts` (add `business_type` to input schema and insert)
- Modify: `src/lib/connect/connect-setup.test.ts` (add `business_type` to test inputs)
- Modify: `src/app/connect/setup/page.tsx` (add business type field to form)
- Modify: `src/app/api/connect/setup/route.ts` (pass `business_type` through to library call)

**Interfaces:**
- The `ConnectSetupInput` type gains a `business_type: string` field (required, non-empty).
- Existing callers of `connectSetup()` must pass `business_type`. Check if there are any callers outside the route (there should not be — it is called only from `src/app/api/connect/setup/route.ts`).

---

- [ ] **Step 1: Read the current `connect-setup.ts` and `connect-setup.test.ts`**

Open both files to understand the current input schema and test patterns before editing.

- [ ] **Step 2: Update `src/lib/connect/connect-setup.ts`**

Find the Zod schema (likely named `connectSetupSchema` or similar) and add `business_type`:

```ts
// Add to the schema object:
business_type: z.string().min(1, 'Business type is required.').max(100),
```

Find the `supabase.from('businesses').insert(...)` call and add `business_type: input.business_type` to the insert object.

Find the `ConnectSetupInput` type export (or infer it from the schema) and verify `business_type` appears in it.

- [ ] **Step 3: Update `src/lib/connect/connect-setup.test.ts`**

Find every call that constructs a valid `ConnectSetupInput` object in the test file. Add `business_type: 'Hair Salon'` (or any non-empty string) to each. Also add a test for the missing field:

```ts
it('rejects missing business_type', async () => {
  // Use the existing test business setup pattern from this file
  // Pass input WITHOUT business_type (or with an empty string)
  const result = await connectSetup(supabase, { ...validInput, business_type: '' })
  expect(result.ok).toBe(false)
})
```

(Follow the exact pattern already established in `connect-setup.test.ts` for similar negative tests.)

- [ ] **Step 4: Run connect-setup tests**

Run: `npx vitest run connect-setup.test.ts`
Expected: all tests pass, including the new rejection test.

- [ ] **Step 5: Update `src/app/api/connect/setup/route.ts`**

In the route handler, find where the request body is parsed and passed to `connectSetup()`. Add `business_type` to the destructured body:

```ts
const { ..., business_type } = body
// ... pass it to connectSetup:
await connectSetup(supabase, { ..., business_type })
```

- [ ] **Step 6: Update `src/app/connect/setup/page.tsx`**

Find the form and add a business type input field between the business name and any other fields. The exact placement is up to the implementer — put it where it reads naturally in the form flow.

```tsx
<label>
  Business type (e.g. Hair Salon, Dental Clinic)
  <input
    type="text"
    name="business_type"
    value={form.business_type}
    onChange={(e) => setForm({ ...form, business_type: e.target.value })}
    required
  />
</label>
```

Also update the form state initializer to include `business_type: ''`, and include it in the `fetch` body.

- [ ] **Step 7: Run full test suite**

Run: `npx vitest run`
Expected: all tests pass.

- [ ] **Step 8: Manual walkthrough**

With `npm run dev` and local Supabase running:
1. Complete the Google OAuth flow to reach connect-setup.
2. Submit the form without filling in Business Type → expect a validation error.
3. Fill in all fields including Business Type and submit → expect success and redirect to dashboard.
4. Verify the `businesses` table row has `business_type` populated (check via `supabase studio`).

- [ ] **Step 9: Commit**

```bash
git add src/lib/connect/connect-setup.ts \
        src/lib/connect/connect-setup.test.ts \
        src/app/connect/setup/page.tsx \
        src/app/api/connect/setup/route.ts
git commit -m "feat: add business_type field to connect-setup"
```

---
