### Task 1: Project Scaffolding + Env Validation

**Files:**
- Create: `package.json`, `tsconfig.json`, `vitest.config.ts`, `.env.example`, `CLAUDE.md`
- Create: `src/lib/env.ts`
- Test: `src/lib/env.test.ts`

**Interfaces:**
- Produces: `validateEnv(env?: NodeJS.ProcessEnv): EnvShape` — used by every later module that needs `process.env`-derived config to fail loudly on misconfiguration.

- [ ] **Step 1: Scaffold the Next.js project**

```bash
npx create-next-app@latest . --typescript --eslint --app --src-dir --import-alias "@/*" --no-tailwind --use-npm
```

If it warns about the directory not being empty (it already contains `.git`, `.gitignore`, `docs/`), proceed — there is no conflicting `package.json` yet, so this is safe.

- [ ] **Step 2: Install runtime and dev dependencies**

```bash
npm install @supabase/supabase-js @supabase/ssr googleapis resend zod
npm install -D vitest @vitest/coverage-v8
```

- [ ] **Step 3: Add `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

- [ ] **Step 4: Add test scripts to `package.json`**

Add to the `"scripts"` block:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: Write `.env.example`**

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
REFRESH_TOKEN_ENCRYPTION_KEY=
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=
GOOGLE_OAUTH_REDIRECT_URI=
RESEND_API_KEY=
RESEND_FROM_EMAIL=
CRON_SECRET=
NEXT_PUBLIC_APP_URL=
```

- [ ] **Step 6: Write the failing test for env validation**

`src/lib/env.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { validateEnv } from './env'

const completeEnv = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
  REFRESH_TOKEN_ENCRYPTION_KEY: 'a'.repeat(44),
  GOOGLE_OAUTH_CLIENT_ID: 'client-id',
  GOOGLE_OAUTH_CLIENT_SECRET: 'client-secret',
  GOOGLE_OAUTH_REDIRECT_URI: 'https://example.com/api/oauth/google/callback',
  RESEND_API_KEY: 'resend-key',
  RESEND_FROM_EMAIL: 'notifications@example.com',
  CRON_SECRET: 'cron-secret',
  NEXT_PUBLIC_APP_URL: 'https://example.com',
}

describe('validateEnv', () => {
  it('returns the parsed env when all required vars are present', () => {
    const result = validateEnv(completeEnv)
    expect(result.NEXT_PUBLIC_SUPABASE_URL).toBe('https://example.supabase.co')
  })

  it('throws when a required var is missing', () => {
    const { GOOGLE_OAUTH_CLIENT_ID, ...incomplete } = completeEnv
    expect(() => validateEnv(incomplete)).toThrow()
  })

  it('throws when a URL var is not a valid URL', () => {
    expect(() => validateEnv({ ...completeEnv, NEXT_PUBLIC_APP_URL: 'not-a-url' })).toThrow()
  })
})
```

- [ ] **Step 7: Run the test to verify it fails**

Run: `npm test -- env.test.ts`
Expected: FAIL — `src/lib/env.ts` does not exist yet.

- [ ] **Step 8: Implement `src/lib/env.ts`**

```ts
import { z } from 'zod'

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  REFRESH_TOKEN_ENCRYPTION_KEY: z.string().min(1),
  GOOGLE_OAUTH_CLIENT_ID: z.string().min(1),
  GOOGLE_OAUTH_CLIENT_SECRET: z.string().min(1),
  GOOGLE_OAUTH_REDIRECT_URI: z.string().url(),
  RESEND_API_KEY: z.string().min(1),
  RESEND_FROM_EMAIL: z.string().email(),
  CRON_SECRET: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url(),
})

export type EnvShape = z.infer<typeof envSchema>

export function validateEnv(env: Record<string, string | undefined> = process.env): EnvShape {
  return envSchema.parse(env)
}
```

- [ ] **Step 9: Run the test to verify it passes**

Run: `npm test -- env.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 10: Write `CLAUDE.md`**

```markdown
# CLAUDE.md

Conventions for this codebase.

- TypeScript strict mode. No `any` without a comment explaining why.
- TDD: write the failing test first for every unit of logic in `src/lib/`.
- Pure logic lives in `src/lib/**` with zero I/O where possible; routes in `src/app/api/**` stay thin (parse/auth, then delegate).
- Never commit `.env` or `.env.local`. Real secrets are entered by the project owner directly into `.env.local`, never pasted into chat.
- `google_refresh_token` is only ever handled encrypted (`src/lib/crypto/encrypt.ts`) outside of the moment it's decrypted to build a `GoogleCalendarProvider` instance.
- Tests are co-located: `foo.ts` + `foo.test.ts` side by side.
- Integration tests require local Supabase running (`supabase start`) and use a fake `CalendarProvider` — never the live Google API.
- No automated browser/E2E tests this phase — manual walkthrough per UI feature instead.
```

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js project with env validation"
```

---

