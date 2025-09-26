# Projetinho Todo List

Projetinho Todo List is a learning-focused to-do application built with Next.js and the AlignUI design system. The project demonstrates how to combine modern React patterns with a lightweight SQLite database while keeping the developer experience approachable for juniors.

## Tech Stack
- Next.js 15 (App Router) + React 19
- TypeScript
- AlignUI design system components stored under `src/components`
- Tailwind CSS v4 utility classes
- SQLite for zero-maintenance persistence during development

## Prerequisites
- Node.js 20.0.0 or newer (Next.js 15 requirement)
- pnpm 9.x (`corepack enable` if pnpm is not already available)
- SQLite CLI (only needed to inspect or seed the local database)

## Getting Started
1. Install dependencies:
   ```bash
   pnpm install
   ```
2. Bootstrap the local database and `.env.local` in one step:
   ```bash
   pnpm run setup:db
   ```
   The script checks for the `sqlite3` CLI, ensures `.env.local` contains `DATABASE_URL=file:./data/todos.db`, creates `data/todos.db`, and replays any SQL migrations in `src/db/migrations`.
3. Start the development server:
   ```bash
   pnpm dev
   ```
4. Visit `http://localhost:3000` to view the app. Edits to files inside `src/` hot-reload automatically.

## Using AlignUI Components
This project relies on AlignUI v1.2 styles and patterns to keep the interface consistent. Review the documentation at [alignui.com/docs/v1.2/introduction](https://www.alignui.com/docs/v1.2/introduction) for usage guidelines. Reusable UI primitives live under:
- `src/components/ui` — ready-to-use AlignUI-inspired building blocks
- `src/components/example-*` — opinionated compositions demonstrating component usage

When adding new screens, compose from existing primitives before introducing bespoke styles. This keeps the visual language aligned with the system.

## Scripts
| Command       | Description                            |
| ------------- | -------------------------------------- |
| `pnpm run setup:db` | Ensure `.env.local`, create the SQLite database, and run migrations. |
| `pnpm dev`    | Start the Next.js development server.  |
| `pnpm build`  | Create an optimized production build.  |
| `pnpm start`  | Run the production build locally.      |
| `pnpm lint`   | Run ESLint with the configured rules.  |

## Project Structure
```
src/
 ├─ app/              # App Router routes and layout
 ├─ components/       # AlignUI-based reusable components
 ├─ hooks/            # Shared hooks (tab observer, notifications, etc.)
 └─ lib/              # Helpers and utilities (to be populated)
```

## Documentation & Roadmap
Feature planning lives in the `docs/` directory. Start with `docs/features.md` for a concise overview of upcoming work items you can share with junior developers.

Feel free to open an issue or a discussion thread before tackling larger changes so we can keep the learning experience collaborative.
