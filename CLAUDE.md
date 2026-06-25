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

## codegraph

This project has a CodeGraph index at `.codegraph/` (local-only, gitignored) covering symbols and call paths across the codebase.

Rules:
- For codebase questions, run `codegraph explore "<question>"` (or the `codegraph_explore` MCP tool, if loaded) before grepping or reading source files. It returns the relevant symbols' verbatim source plus the call paths between them in one shot.
- The index auto-syncs via git hooks after every commit and branch checkout (`.git/hooks/post-commit`, `post-checkout`) — no manual rebuild needed in the common case.
- If you've made many edits without committing, run `codegraph sync` before relying on the graph for those files.
