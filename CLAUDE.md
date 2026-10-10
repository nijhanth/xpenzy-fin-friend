# Claude Code Instructions

## Project

- Xpenzy is a personal-finance web app built with React 18, TypeScript, Vite, Tailwind CSS, and shadcn/ui.
- Application routes are registered in `src/App.tsx`; feature screens live in `src/pages/` and shared UI in `src/components/`.
- Shared state and application services live in `src/contexts/`, `src/hooks/`, and `src/lib/`.
- Supabase integration is in `src/integrations/supabase/` and Edge Functions are in `supabase/functions/`.
- Drizzle's PostgreSQL schema and migrations are under `drizzle/`. Supabase migrations are under `supabase/migrations/`.

## Working Conventions

- Follow the existing TypeScript, React, Tailwind, and component patterns; use the `@/` alias for imports from `src/`.
- Keep changes focused and preserve existing APIs and behavior unless the task requires otherwise.
- Treat database schemas, migrations, authentication, privacy, and financial data handling as sensitive. Inspect related policies and callers before changing them; do not apply migrations to a remote database unless explicitly asked.
- Do not add dependencies when the existing stack already provides an appropriate solution.

## Commands

- `npm run dev` starts the Vite development server on port 8080 by default.
- `npm run lint` runs ESLint.
- `npm run build` runs the production build.
- There is no test script currently defined in `package.json`.

Run the narrowest relevant check after changes, and run lint/build for broader application changes.