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

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
