import { History as HistoryIcon } from 'lucide-react'
import { redirect } from 'next/navigation'
import { getProfile } from '@/lib/queries'
import { getAuthenticatedServerClient } from '@/lib/supabase/server'
import { formatDateLabel, formatVolume } from '@/lib/week'

type SessionSet = {
  exercise_name: string
  order_index: number
  set_index: number
  reps: number | null
  seconds: number | null
  weight: number | null
  completed: boolean
}

/** "45s", "10 × 100", or "45s × 25" for a weighted hold. */
function describeSet(set: SessionSet): string {
  const load = set.weight != null ? ` × ${set.weight}` : ''
  return set.seconds != null
    ? `${set.seconds}s${load}`
    : `${set.reps ?? 0}${load}`
}

export default async function HistoryPage() {
  const { supabase, user } = await getAuthenticatedServerClient()
  if (!user) redirect('/login')

  const [profile, { data: sessions }] = await Promise.all([
    getProfile(supabase, user.id),
    supabase
      .from('workout_sessions')
      .select(
        `id, name, performed_on, completed_at, total_volume,
         session_sets (
           exercise_name, order_index, set_index, reps, seconds, weight, completed
         )`,
      )
      .eq('user_id', user.id)
      .not('completed_at', 'is', null)
      .order('performed_on', { ascending: false })
      .limit(100),
  ])

  const unit = profile?.unit_preference ?? 'lbs'
  const rows = sessions ?? []

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-8 sm:py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">History</h1>
        <p className="mt-1.5 text-muted">
          {rows.length === 0
            ? 'Completed workouts will show up here.'
            : `${rows.length} completed workout${rows.length === 1 ? '' : 's'}.`}
        </p>
      </header>

      {rows.length === 0 ? (
        <div className="card flex flex-col items-center py-10 text-center">
          <span className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-accent/15">
            <HistoryIcon className="size-6 text-accent" />
          </span>
          <h2 className="text-lg font-semibold">Nothing logged yet</h2>
          <p className="mt-1 max-w-sm text-sm text-muted">
            Finish a workout from your overview and it will appear here with
            every set you recorded.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((session) => {
            const sets = ((session.session_sets ?? []) as SessionSet[]).filter(
              (s) => s.completed,
            )
            const byExercise = groupByExercise(sets)

            return (
              <li key={session.id}>
                <details className="card group">
                  <summary className="flex cursor-pointer items-center justify-between gap-4 list-none">
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {session.name ?? 'Workout'}
                      </p>
                      <p className="text-sm text-muted">
                        {formatDateLabel(session.performed_on)} · {sets.length}{' '}
                        sets
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-medium text-accent tabular-nums">
                      {formatVolume(Number(session.total_volume), unit)}
                    </span>
                  </summary>

                  {byExercise.length > 0 ? (
                    <div className="mt-4 space-y-3 border-t border-edge pt-4">
                      {byExercise.map(([name, exerciseSets]) => (
                        <div key={name}>
                          <p className="text-sm font-medium">{name}</p>
                          <p className="mt-0.5 text-sm text-muted tabular-nums">
                            {exerciseSets.map(describeSet).join('  ·  ')}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-4 border-t border-edge pt-4 text-sm text-muted">
                      No individual sets were recorded for this workout.
                    </p>
                  )}
                </details>
              </li>
            )
          })}
        </ul>
      )}
    </main>
  )
}

function groupByExercise(sets: SessionSet[]): [string, SessionSet[]][] {
  const groups = new Map<string, SessionSet[]>()
  for (const set of [...sets].sort(
    (a, b) => a.order_index - b.order_index || a.set_index - b.set_index,
  )) {
    const existing = groups.get(set.exercise_name)
    if (existing) existing.push(set)
    else groups.set(set.exercise_name, [set])
  }
  return Array.from(groups.entries())
}
