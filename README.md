# shipyard.dev

Portfolio-first platform for software engineering and tech students to share projects, publish ideas, and collaborate in a social hub.

## Stack

- Next.js (App Router)
- Bun (runtime + package manager)
- Supabase (Auth, Postgres, Storage + RLS)

## Implemented now

- `/auth` email magic-link + GitHub auth
- `/projects` project-only feed
- `/projects/new` project publish form
- `/hub` unified social feed for projects + ideas
- social actions: likes, comments, reports
- feed tabs: newest + trending
- `supabase/schema.sql` with tables, RLS, and feed RPCs

## Local setup

1. Install dependencies:

```bash
bun install
```

2. Create local environment file:

```bash
cp .env.example .env.local
```

3. Add Supabase values in `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

4. In Supabase SQL editor, run everything in:

```sql
-- paste supabase/schema.sql
```

5. Enable auth providers in Supabase:

- Email
- GitHub (optional)

6. Run development server:

```bash
bun dev
```

Open `http://localhost:3000`.
