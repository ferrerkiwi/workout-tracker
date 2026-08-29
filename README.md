# RepCadence

RepCadence is a personal training companion for building a weekly routine,
logging each workout, and reviewing your progress. It includes editable plans,
a focused Routine Coach, and Guided Set tempo cues for rep-based work.

## Local development

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and fill in the required values.
3. Start the app with `npm run dev`.
4. Open [http://localhost:3000](http://localhost:3000).

## Environment variables

`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` connect
the app to Supabase. `ANTHROPIC_API_KEY` is server-only and is used by the
Routine Coach. `ANTHROPIC_ROUTINE_AGENT_MODEL` is optional and overrides the
Routine Coach model.

For production, configure `NEXT_PUBLIC_SITE_URL` with the public app origin.

## Checks

```bash
npm run lint
npm test
npx tsc --noEmit --incremental false
npm run build
```

## Supabase workflow

Application migrations live in `supabase/migrations/`, and
`src/lib/database.types.ts` is generated from the linked project. After any
schema change, create a timestamped migration, apply it, regenerate the types,
then run the checks above.

The repository currently contains the recent migrations only; the production
project has older migration history that predates this checkout. Before relying
on a local Supabase reset or adding a staging database, reconcile that history
with `supabase db pull` from a linked CLI session and review the generated
baseline migration. Do not reset the production project.

Supabase Auth's leaked-password protection is available only on Pro and above.
The advisor will continue to report it while this project remains on the Free
plan; no billing change is required for the application to operate.
