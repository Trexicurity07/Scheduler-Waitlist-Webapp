### Task 4: Token Generator Module

**Files:**
- Create: `src/lib/tokens/generate-token.ts`
- Test: `src/lib/tokens/generate-token.test.ts`

**Interfaces:**
- Produces: `generateToken(): string` — used by Task 17 (waitlist signup, email verification token), Task 14 (slot offer notification token), and wherever a `notifications.token` value is created.

- [ ] **Step 1: Write the failing tests**

`src/lib/tokens/generate-token.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { generateToken } from './generate-token'

describe('generateToken', () => {
  it('returns a base64url string with no padding or unsafe characters', () => {
    const token = generateToken()
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it('returns a different value on each call', () => {
    expect(generateToken()).not.toBe(generateToken())
  })

  it('returns at least 32 characters of entropy', () => {
    expect(generateToken().length).toBeGreaterThanOrEqual(32)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- generate-token.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement `src/lib/tokens/generate-token.ts`**

```ts
import { randomBytes } from 'node:crypto'

export function generateToken(): string {
  return randomBytes(32).toString('base64url')
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- generate-token.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/tokens
git commit -m "feat: add secure token generator"
```

---

