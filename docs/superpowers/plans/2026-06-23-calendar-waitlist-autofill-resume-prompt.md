# Resume Prompt — Calendar Waitlist Autofill (paste this as your first message in the next session)

I'm resuming execution of the calendar-waitlist-autofill plan. The prior coordinating session was retired deliberately (its context window had grown large relative to progress) — you are starting cold by design. Read these in order before doing anything else:

1. `docs/superpowers/plans/2026-06-23-calendar-waitlist-autofill-handoff.md` — original handoff/governance (goal, hard rules, agent/model guidance). Still fully accurate, written once at project start.
2. `docs/superpowers/specs/2026-06-23-calendar-waitlist-autofill-design.md` — design spec.
3. `docs/superpowers/plans/2026-06-23-calendar-waitlist-autofill-plan.md` — the 24-task plan, pinned, do not restructure.
4. `.superpowers/sdd/progress.md` — durable ledger. **Trust this + `git log` over any assumption about what's done.** Tasks 1-6 are complete and reviewed. Task 7 is *implemented but not yet reviewed* — read the ledger's Task 7 entry carefully, it documents infrastructure changes (a new migration, a vitest config fix) that the reviewer must evaluate as in-scope.

Branch: `feature/calendar-waitlist-autofill`. Don't trust any in-memory task list from a prior session (e.g. TaskCreate/TaskUpdate state) — recreate your own todo list from the plan + ledger as your first action.

## Step 0 — before dispatching anything

Verify local infrastructure is still up (it was running fine when the prior session ended; this just confirms nothing died in between):

```
npx supabase status
```

Expect API at `http://127.0.0.1:55321`, DB at `127.0.0.1:55322`. (Ports are remapped from Supabase's default 54321-54329 — see "Known environment quirks" below; `config.toml` already has this correct, don't touch it.) `supabase_imgproxy_Project`, `supabase_edge_runtime_Project`, and `supabase_pooler_Project` are expected to show **stopped** — that's intentional (unused by this project). If the API/DB themselves are down, just `npx supabase start` — don't re-diagnose, the config is already correct.

Then your actual first task: **dispatch the Task 7 reviewer.** Generate the review package (`scripts/review-package 075d320 e379c20` from the `subagent-driven-development` skill's scripts — invoke the skill to get the current path), then dispatch a Sonnet-tier reviewer with the Task 7 brief (`.superpowers/sdd/task-7-brief.md`), report (`.superpowers/sdd/task-7-report.md`), and the diff package. Explicitly tell the reviewer that `supabase/migrations/0002_grant_service_role.sql` and the `vitest.config.ts` change are in-scope necessary infrastructure fixes this task correctly surfaced (Task 2's migration never granted `service_role` table privileges, which silently blocks every later task using `createServiceRoleClient()`) — review them on their own merits, not as scope creep to reject. On Approved: update the ledger, mark Task 7 complete, continue to Task 8.

## Process for every task (8 through 24)

Use `superpowers:subagent-driven-development` exactly as before: `scripts/task-brief` extraction → fresh implementer subagent → `scripts/review-package` → task reviewer (spec + quality verdicts) → fix/re-review loop on Critical/Important findings → ledger update on clean review → immediately next task, no pause.

**Model tiers** (see the skill's Model Selection section for full rationale):
- Brief contains complete verbatim code, task is mechanical transcription (1-2 files) → cheapest tier (Haiku).
- Multi-file integration/judgment work (e.g. Task 7 was this tier) → standard tier (Sonnet).
- **Opus escalation required** for implementer *and* reviewer on: Task 9 (CalendarProvider/GoogleCalendarProvider — OAuth token refresh + Google API error handling), Task 18 (Business Orchestrator + cron poll route), Task 21 (confirm/decline race conditions). Task 2 (RLS) already got this treatment and is done.
- Never dispatch multiple implementer subagents in parallel. A reviewer running alongside the *next* task's implementer is fine (different role, no working-tree conflict) — this session did that productively between Tasks 5/6 and 6/7.

**Pacing across tool calls:** use `ScheduleWakeup` (60-3600s) between dispatching a subagent and processing its result instead of polling. Keep each subagent's dispatch prompt tight and self-contained (brief path + report path + scene-setting, not pasted history) — bloated prompts and over-frequent short wakeups are most of what drove this session's context/token growth.

## Standing rules for this entire phase (not just this session) — the user is away, do not prompt them

**No more prompts, period.** The user has explicitly and repeatedly said: do not ask questions once coding starts, do not pause for check-ins between tasks, do not stop to summarize progress. Keep executing until all 24 tasks + final review are done, or you hit a genuine BLOCKED/ambiguity/plan-contradiction/dead-subagent-recovery you truly cannot resolve yourself.

**Never `git push`, and never ask about pushing.** Enforced both technically (`.claude/settings.local.json` denies `git push*` for Bash and PowerShell) and as a standing instruction. The user pushes themselves when they're back.

**Avoid destructive git operations.** `git reset --hard`, `git clean -f`, `git branch -D`, `git checkout -- <path>` / `git restore <path>` are denied at the permission layer too. If one seems genuinely needed, stop and explain rather than finding a workaround. Prefer new commits over `--amend`.

**Permissions are otherwise wide open.** `defaultMode: bypassPermissions` is set project-wide in `.claude/settings.local.json` (this directory only) — Bash, PowerShell, Read, Edit, Write, and subagent dispatch all run without approval prompts, specifically so unattended subagents don't stall. This file persists across sessions/instances automatically — you should already have these permissions with no setup needed.

**Secrets policy:**
- `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET` and `RESEND_API_KEY` / `RESEND_FROM_EMAIL` need real external accounts only the user can create. **Never fabricate these** — they're already blank in `.env.local`, leave them blank.
- `REFRESH_TOKEN_ENCRYPTION_KEY` and `CRON_SECRET` are already generated and populated in `.env.local` (local-dev-only values, no external account). Nothing to do here.
- Every task's automated test suite mocks external I/O (`vi.mock('googleapis', ...)`, `vi.mock('resend', ...)`, fake `CalendarProvider`) — confirmed by reading Tasks 3, 9, 10, 13. **No task's TDD implementation work is blocked by a missing real secret.** Only the *manual walkthrough* step on UI-facing tasks (10, 12, 13, 19-24ish) needs real credentials — when you reach one of those, implement and test fully on mocks, skip the manual walkthrough, note it as deferred in that task's report, mark the task complete, keep going. Don't stop and don't ask.

**Continuous execution.** Keep dispatching task after task until all 24 are done and the final review is complete, or a real blocker. A dead subagent (one that errors out or returns nothing useful) cannot be resumed — inspect its partial work directly on disk and finish it yourself or re-dispatch fresh; this happened once already this project (Task 7's first attempt died on a session-limit cutoff with zero files written — confirmed via `ls` before re-dispatching, then it was safe to redo from scratch).

**When all 24 tasks are done:** dispatch the final whole-branch reviewer per `superpowers:requesting-code-review` (most capable available model, `review-package` from `git merge-base main HEAD` to `HEAD`), then follow `superpowers:finishing-a-development-branch` — stop short of any push step. Report the branch as ready and wait for the user.

## Known environment quirks (already solved, don't re-diagnose)

- **Supabase ports remapped** in `supabase/config.toml` from default 54321-54329 to 55321-55329 — this machine has a Windows Hyper-V dynamic port-exclusion range that collides with the defaults. Already fixed, don't touch.
- **`[edge_runtime]` disabled** in `config.toml` — this project has zero Supabase Edge Functions; the container failed on DNS resolution in this environment when it was briefly enabled. Leave disabled.
- **`service_role` had no table grants** until Task 7's implementer added `supabase/migrations/0002_grant_service_role.sql` (PostgREST checks grants before RLS). Already fixed and applied. If you ever need to reset the local DB (`supabase db reset`), both migrations reapply automatically.
- **`supabase_vector_Project`** (log-shipping sidecar) is stuck in a restart loop. Cosmetic — the app doesn't use it. Not worth investigating unless it starts causing real problems.
- If `docker restart supabase_kong_Project` is ever needed after a `db reset` (Kong can cache a stale upstream IP for the Auth container), that's a known benign fix, not a sign of a deeper problem.

## On scheduled auto-resume (context, not an instruction)

Earlier in this project we tried `CronCreate`/`ScheduleWakeup` to auto-resume across a token/session-limit reset while the user was away. It's unclear whether those fire on a true unattended timer or only get delivered once the client reconnects — evidence from this session (low quota usage observed immediately on the user's return) leaned toward the latter. The user may be using an external OS-level mechanism instead (e.g., a scheduled keystroke into an already-open, already-typed terminal prompt) to trigger the next turn at the right wall-clock time. If a message arrives that looks like a scheduled resume, just treat it as a normal continuation instruction — no special handling needed on your end.
