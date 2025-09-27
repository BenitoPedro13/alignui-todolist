# Feature Implementation Guide

This roadmap breaks down the todo app into teachable chunks. Each bullet points at existing AlignUI components so juniors know what to reuse before building anything custom.

## Stage 1 — Foundation
- [x] **SQLite bootstrap**: add `better-sqlite3` (`pnpm add better-sqlite3`) and create `src/lib/db.ts` with a singleton connection that reads `DATABASE_URL`. Keep `scripts/setup-db.mjs` in sync so `pnpm run setup:db` prepares the environment automatically.
- [x] **Schema setup**: create a migration script (simple SQL file is fine) that creates a `todos` table with `id`, `title`, `description`, `is_completed`, `priority`, `due_date`, and timestamp columns. Check in the SQL under `src/db/migrations/0001_init.sql`.
- [x] **Repository utilities**: expose helper functions in `src/lib/todo-repository.ts` for CRUD operations. Keep the API promise-based so it can plug into React Server Actions later.

## Stage 2 — Core Todo Flow
- [x] **Create task**: build a task composer form under `src/components/todos/todo-composer.tsx` using `input`, `textarea`, `select`, `date-picker`, and `fancy-button` from `src/components/ui`. Validate required fields and save via the repository.
- [x] **List & status toggle**: render tasks in a responsive list in `src/components/todos/todo-list.tsx`. Use `checkbox`, `badge`, `progress-bar`, and `hint` components to show status, priority, and due dates. Persist status changes immediately.
- [x] **Edit & delete**: add row actions with `dropdown`, `modal`, and `compact-button` to edit or remove a task. Surface confirmation via `toast-alert`.

## Stage 3 — Productivity Enhancements
- [x] **Filters**: add quick filters (All / Active / Completed / Overdue) using `segmented-control` in the list header. Support search by title via `input`.
- [x] **Batch actions**: enable multi-select with `checkbox` group and bulk complete/delete actions surfaced through `button-group` and `toast` notifications.
- [x] **Progress overview**: add a summary panel in `src/components/todos/todo-summary.tsx` composed from `divider`, `progress-circle`, and `status-badge`. Display counts and completion percentage.

## Stage 4 — Polish & Quality
- [x] **Server Actions integration**: migrate list mutations to Next.js Server Actions in the relevant route handlers so the database logic stays on the server.
- [ ] **Empty states & errors**: use `banner`, `alert`, and `avatar-empty-icons` to guide users when the list is empty or errors occur.
- [ ] **Docs & demos**: record short Loom-style walkthroughs or GIFs once features land, then update `README.md` and this doc to stay aligned with the implementation.

> Definition of done for every task: UI uses existing AlignUI components, database changes are covered by a short test script or manual verification steps, and developer-facing docs receive a brief note about the update.
