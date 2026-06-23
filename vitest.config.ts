import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import path from 'node:path'

// Vitest (unlike Next.js) does not auto-load .env.local, but several
// integration tests (e.g. src/lib/db/supabase.test.ts) need the real
// local Supabase credentials from it. Load with an empty prefix since
// SUPABASE_SERVICE_ROLE_KEY etc. aren't NEXT_PUBLIC_-prefixed; these are
// local-only dev values, never committed (.env.local is gitignored).
const localEnv = loadEnv('test', process.cwd(), '')
for (const [key, value] of Object.entries(localEnv)) {
  if (process.env[key] === undefined) process.env[key] = value
}

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
