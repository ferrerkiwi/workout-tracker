# RepCadence

RepCadence is a personal training companion for building a weekly routine,
logging each workout, and reviewing your progress. It includes editable plans,
a focused Routine Coach, and Guided Set tempo cues for rep-based work.

Workouts open to an exercise list. Start any exercise, review the next set's
target and load, then use the elapsed timer or optional tempo guidance. Stopping
tempo (by voice or button) opens the actual-reps form; results are saved only
after confirmation. Each saved set advances to the next set of that exercise.

Completing every rep target on a loaded exercise increases its plan weight once
per workout: 10 lb for compound exercises or 5 lb for isolation exercises (the
equivalent in kilograms for kg plans). Common movement types are recognized and
can be corrected before starting or saving a set. Timed and bodyweight exercises
do not automatically increase weight. Workout targets are snapshotted when the
session opens, and progression never overwrites a plan edited during a workout.

**Live app:** [workout-tracker-six-lilac.vercel.app](https://workout-tracker-six-lilac.vercel.app/)

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

`tests/workout-progression.sql` checks the transactional workout flow, progression,
retry behavior, and ownership policies against a migrated Supabase database.
Run it as a database administrator; all fixtures and changes are rolled back.

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

## Demo mode

The homepage's **Try demo** action uses Supabase Anonymous Sign-Ins, so each
visitor receives an isolated, temporary account and its own seeded plan and
history. Anonymous Sign-Ins are enabled for the linked Supabase project. Before
sharing the demo broadly, configure CAPTCHA or Cloudflare Turnstile in Supabase
Auth to limit automated anonymous-account creation. Supabase does not
automatically delete anonymous users; review retention and cleanup separately
before introducing any destructive cleanup job.
