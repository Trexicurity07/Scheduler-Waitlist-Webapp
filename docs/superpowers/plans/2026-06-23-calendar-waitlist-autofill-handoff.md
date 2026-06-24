# Implementation Handoff: Calendar Waitlist Auto-Fill (Phase 1)

**Paste this whole file as your first message in a brand-new Claude Code session** (not a continuation of the planning session — that session has accumulated a long history and is being retired specifically so you start with clean context). This repo's memory system will load automatically; the two documents below are the load-bearing context.

## Read this first, in order

1. `docs/superpowers/specs/2026-06-23-calendar-waitlist-autofill-design.md` — the approved Phase 1 design spec (problem, architecture, 15 sections).
2. `docs/superpowers/plans/2026-06-23-calendar-waitlist-autofill-plan.md` — the 24-task TDD implementation plan. **This is your actual work order.** It was written assuming you have zero prior context on this codebase: every task names exact files, contains complete test + implementation code, exact commands with expected output, and a "Consumes/Produces" block so later tasks don't require you to guess earlier tasks' types or signatures.
3. `CLAUDE.md` at the repo root, if present (created by Task 1) — project-specific conventions.

Both docs are already committed (`1394306` = design spec, `7088ed4` = plan). Don't re-run brainstorming or writing-plans — both phases are complete, approved, and the plan already went through a self-review pass (spec coverage, placeholder scan, cross-task type consistency) immediately before this handoff. Don't replan or restructure the task list.

## Goal

Build Phase 1 of a zero-cost SaaS for appointment-based small businesses (groomers, trainers, cleaners, salons, coaches — solo/tiny teams). It detects cancellations in a business's Google Calendar and automatically offers the freed slot to clients on a waitlist via email + a `wa.me` WhatsApp deep link, letting the client confirm into a real replacement Calendar event. Phase 1 is Google Calendar only (architected behind a `CalendarProvider` interface for future providers, but no other provider is built now). No AI/LLM features, no payment tiers, no automated browser/E2E tests this phase. Runs entirely on free-tier infrastructure: Vercel Hobby, Supabase free tier, Resend free tier, an external free cron scheduler hitting `/api/cron/poll` every 5 minutes.

## Your job

Invoke the `superpowers:subagent-driven-development` skill and execute the plan task-by-task, starting at Task 1, in order. For each task: dispatch a fresh subagent, have it follow the task's steps exactly as written — write the failing test, **actually run it** and confirm it fails for the stated reason, implement, **actually run it** and confirm it passes, do the manual walkthrough if the task specifies one instead of a Vitest step, then commit. Review the subagent's work before moving to the next task. The "run and verify" steps are the actual point of TDD here, not formality — don't take "this should work" on faith.

## Hard rules

- **You are pre-authorized to run every `git commit` the plan calls for, without asking first.** The user has explicitly authorized this for this implementation pass. Local commits only — do **not** `git push` to any remote unless the user explicitly asks.
- Follow the plan's "Global Constraints" section (top of the plan file) on every task: TypeScript strict mode, Node.js runtime only (never Edge — `googleapis`/`node:crypto` need it), no Calendar push webhooks, no monetization tiers, no automated E2E, replacement events have no attendee invite, only the dedicated bookings calendar is ever touched, `min_confirm_lead_hours < min_notice_hours` enforced wherever set, refresh tokens encrypted at rest (AES-256-GCM, key only in env, never logged/sent to client).
- The zero-cost constraint is load-bearing for the whole project — don't introduce any paid service, tier, or dependency not already named in the plan.
- TDD strictly: never write implementation code before its failing test exists and has actually been run.
- YAGNI / no scope creep: implement exactly what each task specifies. No extra abstractions, no opportunistic refactors, no speculative error handling or validation beyond what's written in that task.
- Real secrets (Google OAuth client ID/secret, Supabase project URL/keys, Resend API key, `REFRESH_TOKEN_ENCRYPTION_KEY`, `CRON_SECRET`) come from the user via `.env.local` — never invent, guess, or hardcode them. When a task needs one (Task 1 scaffolding, Task 10 OAuth, Task 13 Resend especially), stop and ask the user by name for that specific variable.
- Integration tests require `supabase start` (local Supabase via the Supabase CLI) running, plus Node/npm installed. If either is missing, stop and tell the user — don't skip or fake a test result.
- Don't change the database schema/migration beyond exactly what Task 2 specifies without asking first — the column list was deliberately pinned with the user ahead of time, before any task was written.
- Keep the user informed of progress — notify when you're starting implementation, and again at major section boundaries (onboarding/connect, cron pipeline, public signup/verify/confirm flows, dashboard). The user likes visibility into when implementation work is actually happening, not just a final report.

## Agent / model guidance

- Run this coordinating session on **Sonnet 4.6** (current default) — the plan front-loads essentially all the hard reasoning, so executing it task-by-task is largely mechanical: place the code, run the command, check the real output matches.
- Escalate to **Opus** for the two-stage review step `subagent-driven-development` runs between tasks, and specifically for Task 2 (RLS policies), Task 9/18 (OAuth token refresh + Google API error handling), and Task 21 (confirm/decline race conditions) — these carry the most subtle correctness/security risk in the plan.
- One fresh subagent per task, in order. Don't batch multiple tasks into a single dispatch, and don't jump ahead — later tasks consume exact types/functions/table columns that earlier tasks produce (see each task's "Consumes" line).

## What "done" looks like

All 24 tasks committed, each with passing tests (or a completed manual walkthrough for the handful of tasks with no Vitest step), Phase 1 feature-complete end to end: owner connects Google Calendar and picks/creates a dedicated bookings calendar, the cron poll route detects cancellations and matches/notifies the waitlist in batches, clients confirm or decline via email + WhatsApp link, and the dashboard shows upcoming appointments, waitlist management, and notification history.

## If something in the plan turns out to be wrong

Fix it, note what changed and why in the commit message, and keep going. Only stop and ask the user if it's a secret/credential, a genuine ambiguity the plan doesn't resolve, or something that would change the data model already pinned in Task 2's migration.
