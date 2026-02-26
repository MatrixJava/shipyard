# shipyard.dev

Portfolio-first platform for software engineering and tech students to share projects, publish ideas, and collaborate in a social hub.

## Stack

- Next.js (App Router)
- Bun (runtime + package manager, Bun 1.3+)
- Supabase (Auth, Postgres, Storage + RLS)

## Implemented now

- `/auth` email magic-link + GitHub auth
- `/projects` project-only feed
- `/projects/new` project publish form
- `/hub` unified social feed for projects + ideas
- `/leaderboard` open-source SR ladder for commit performance
- social actions: likes, comments, reports
- feed tabs: newest + trending
- `supabase/schema.sql` with tables, RLS, and feed/leaderboard RPCs

## Backend target

- Hosted Supabase project is the default development target.

## Local setup

1. Verify Bun:

```bash
bun --version
```

2. Install dependencies:

```bash
bun install
```

3. Create local environment file from template:

```bash
cp .env.example .env.local
```

PowerShell alternative:

```powershell
Copy-Item .env.example .env.local
```

4. Add Supabase values in `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

5. In the Supabase SQL editor, run all SQL in `supabase/schema.sql`.

6. Enable auth providers in Supabase:

- Email
- GitHub (optional)

7. Run development server:

```bash
bun run dev
```

Open `http://localhost:3000`.

## CI/CD

GitHub Actions workflows included:

- `CI` (`.github/workflows/ci.yml`)
  - Runs on PRs to `main` and pushes to `main`/`develop`
  - Uses Bun 1.3.9
  - Executes `bun install --frozen-lockfile`, `bun run lint`, and `bun run build`

- `Dependency Review` (`.github/workflows/dependency-review.yml`)
  - Runs on PRs to `main`
  - Blocks risky dependency changes

- `CodeQL` (`.github/workflows/codeql.yml`)
  - Runs on PRs to `main`, pushes to `main`/`develop`, and weekly schedule
  - Performs static security analysis for JavaScript/TypeScript

- `Deploy to Vercel (Production)` (`.github/workflows/deploy-vercel.yml`)
  - Runs on pushes to `main` (and manual dispatch)
  - Builds with Vercel CLI and deploys prebuilt artifacts

- `Dependabot` (`.github/dependabot.yml`)
  - Weekly dependency and GitHub Actions update PRs
  - Groups key frontend dependencies to reduce PR noise

Required GitHub repo secrets for Vercel deploy:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
