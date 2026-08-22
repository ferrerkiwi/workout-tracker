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
Routine Coach.

For production, configure `NEXT_PUBLIC_SITE_URL` with the public app origin.

## Checks

```bash
npm run lint
npx tsc --noEmit --incremental false
npm run build
```
