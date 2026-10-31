# RepCadence

RepCadence is a personal training companion for building a weekly routine,
logging each workout, and reviewing your progress. It includes editable plans,
a focused Routine Coach, and Guided Set tempo cues for rep-based work.

Workouts open to an exercise list. Start any exercise, review the next set's
target and load, then use the elapsed timer or optional tempo guidance. Stopping
tempo (by voice or button) opens the actual-reps form and starts a rest timer.
Weights are read-only during workouts and are edited in the plan. Rest on the
results screen, then choose **Save and continue to next set** to save the result
and start the next set directly. The final set returns to the exercise list.

Completing every rep target on a loaded exercise increases its plan weight once
per workout: 10 lb for compound exercises or 5 lb for isolation exercises (the
equivalent in kilograms for kg plans). Common movement types are recognized and
can be corrected before starting or saving a set. Timed and bodyweight exercises
do not automatically increase weight. Workout targets refresh from the plan when an exercise has no saved sets and
the workout is reopened. Once an exercise has a saved set, its targets stay
fixed. Progression never overwrites a plan edited during a workout.

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

## Dates, units, and AI limits

Calendar dates use the browser's IANA timezone, shared with the server in a
non-sensitive cookie. Switching between pounds and kilograms converts active
plan weights atomically. Each workout keeps its original unit; weekly volume
converts those saved units into the current preference before adding totals.
Legacy sessions without exercise snapshots were assigned the profile unit at
migration time because the previous schema did not record their original unit.

Registered accounts can generate five routines and send 30 coach requests per
UTC day. Demo accounts have three coach requests per UTC day. All accounts
share a limit of six requests per minute and one AI request in flight per user.
Limits and request responses are stored in a private database schema. Replaying
an existing request returns its recorded response without repeating saved edits.
Interrupted coach requests report any saved changes and refresh the plan.

Run both `tests/workout-progression.sql` and `tests/audit-regressions.sql` as a
database administrator to check progression, units, plan corrections, ownership,
usage protection, request replay, concurrency, and daily quotas. Both suites
create synthetic fixtures and roll everything back.

`npm audit --omit=dev` checks deployed dependencies. The remaining full-audit
advisories concern development-only ESLint dependencies on older minimatch
APIs; forcing a major override would break those callers. They do not ship in
the production application.

## Demo mode

The homepage's **Try demo** action uses Supabase Anonymous Sign-Ins, so each
visitor receives an isolated, temporary account and its own seeded plan and
history. Anonymous Sign-Ins are enabled for the linked Supabase project. Before
sharing the demo broadly, configure CAPTCHA or Cloudflare Turnstile in Supabase
Auth to limit automated anonymous-account creation. Supabase does not
automatically delete anonymous users; review retention and cleanup separately
before introducing any destructive cleanup job.
