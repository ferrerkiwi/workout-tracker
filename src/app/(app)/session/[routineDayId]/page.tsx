import { ArrowLeft, CalendarClock } from 'lucide-react'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { SessionLogger } from '@/components/session-logger'
import { DAY_NAMES } from '@/lib/constants'
import type { RoutineExercise } from '@/lib/queries'
import { getLastPerformed, getProfile } from '@/lib/queries'
import { createClient } from '@/lib/supabase/server'
import { dateForRoutineDay, isFuture, relativeDayLabel } from '@/lib/week'

export default async function SessionPage({
  params,
}: PageProps<'/session/[routineDayId]'>) {
  const { routineDayId } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // RLS scopes routine_days to the owner, so a foreign id simply returns null.
  const { data: day } = await supabase
    .from('routine_days')
    .select(
      `id, name, day_of_week, is_rest_day,
       routines ( week_start_date ),
       routine_exercises (
         id, order_index, exercise_name, metric, target_sets, target_reps,
         target_seconds, target_weight, rest_seconds, notes
       )`,
    )
    .eq('id', routineDayId)
    .maybeSingle()

  if (!day) notFound()

  const routine = day.routines as { week_start_date: string } | null
  const scheduledFor = routine
    ? dateForRoutineDay(routine.week_start_date, day.day_of_week)
    : null
  const notYet = scheduledFor ? isFuture(scheduledFor) : false

  const [profile, lastPerformed] = await Promise.all([
    getProfile(supabase, user.id),
    getLastPerformed(supabase, user.id),
  ])
  const unit = profile?.unit_preference ?? 'lbs'

  const exercises = [...((day.routine_exercises ?? []) as RoutineExercise[])].sort(
    (a, b) => a.order_index - b.order_index,
  )

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-8 sm:py-12">
      <header className="mb-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Overview
        </Link>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">{day.name}</h1>
        <p className="mt-1 text-muted">
          {DAY_NAMES[day.day_of_week]} · {exercises.length} exercises
        </p>
      </header>

      {notYet ? (
        <div className="card flex flex-col items-center py-10 text-center">
          <span className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-surface-2">
            <CalendarClock className="size-6 text-muted" />
          </span>
          <h2 className="text-lg font-semibold">
            Not {relativeDayLabel(scheduledFor!)} yet
          </h2>
          <p className="mt-1 max-w-sm text-sm text-muted">
            This session is scheduled for{' '}
            {DAY_NAMES[day.day_of_week]}. Come back then — logging it early
            would put it on the wrong day and throw off your volume and streak.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Link href="/dashboard" className="btn-ghost">
              Back to overview
            </Link>
            <Link href="/plan" className="btn-ghost">
              Move it to today
            </Link>
          </div>
        </div>
      ) : day.is_rest_day || exercises.length === 0 ? (
        <div className="card text-center">
          <p className="font-medium">Nothing to log here.</p>
          <p className="mt-1 text-sm text-muted">
            {day.is_rest_day
              ? 'This is a scheduled rest day.'
              : 'This day has no exercises yet — add some in the weekly plan.'}
          </p>
          <Link href="/plan" className="btn-ghost mt-4">
            Edit weekly plan
          </Link>
        </div>
      ) : (
        <SessionLogger
          routineDayId={day.id}
          dayName={day.name}
          exercises={exercises}
          unit={unit}
          lastPerformed={lastPerformed}
        />
      )}
    </main>
  )
}
