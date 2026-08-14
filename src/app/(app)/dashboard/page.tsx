import {
  CalendarDays,
  ChevronRight,
  Flame,
  Play,
  Sparkles,
  TrendingUp,
} from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { DAY_NAMES } from '@/lib/constants'
import {
  getProfile,
  getRoutineForWeek,
  getStreakSource,
  getThisWeekSessions,
} from '@/lib/queries'
import { buildPlanLookup, computeStreak } from '@/lib/streak'
import { createClient } from '@/lib/supabase/server'
import {
  addDays,
  formatVolume,
  fromDateKey,
  mondayIndex,
  relativeDayLabel,
  startOfWeek,
  toDateKey,
  today,
} from '@/lib/week'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const now = today()
  const weekStart = startOfWeek(now)
  const weekStartKey = toDateKey(weekStart)

  const [profile, routine, streakSource, weekSessions] = await Promise.all([
    getProfile(supabase, user.id),
    getRoutineForWeek(supabase, user.id, weekStartKey),
    getStreakSource(supabase, user.id),
    getThisWeekSessions(supabase, user.id),
  ])

  const unit = profile?.unit_preference ?? 'lbs'

  const streak = computeStreak({
    completedDates: streakSource.completedDates,
    plan: buildPlanLookup(streakSource.routines),
  })

  const weekVolume = weekSessions.reduce((sum, s) => sum + Number(s.total_volume), 0)

  const todayIndex = mondayIndex(now)
  const todayEntry =
    routine?.routine_days.find((d) => d.day_of_week === todayIndex) ?? null
  const doneToday = streakSource.completedDates.has(toDateKey(now))
  const restToday = todayEntry?.is_rest_day ?? false

  // Only today's own session can be started. A workout scheduled for a later
  // day is shown as a preview: starting it early would log it under today's
  // date and distort both the weekly volume and the streak.
  const todayWorkout =
    todayEntry && !todayEntry.is_rest_day && !doneToday ? todayEntry : null

  const upcoming =
    routine?.routine_days.find(
      (d) => d.day_of_week > todayIndex && !d.is_rest_day,
    ) ?? null
  const upcomingDate = upcoming
    ? addDays(weekStart, upcoming.day_of_week)
    : null

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-8 sm:py-12">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {profile?.display_name ? `Hi ${profile.display_name}` : 'Overview'}
          </h1>
          <p className="mt-1 text-muted">
            Week of{' '}
            {weekStart.toLocaleDateString(undefined, {
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
        <Link href="/plan" className="btn-primary">
          <CalendarDays className="size-4" />
          Weekly plan
          <ChevronRight className="size-4" />
        </Link>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={<Flame className="size-4" />}
          label="Current streak"
          value={`${streak} ${streak === 1 ? 'day' : 'days'}`}
          hint="Rest days count. Missing a scheduled workout resets it."
        />
        <StatCard
          icon={<TrendingUp className="size-4" />}
          label="Volume this week"
          value={formatVolume(weekVolume, unit)}
          hint={`${weekSessions.length} workout${
            weekSessions.length === 1 ? '' : 's'
          } logged`}
        />
        <StatCard
          icon={<Play className="size-4" />}
          label="Next workout"
          value={
            todayWorkout
              ? todayWorkout.name
              : upcoming
                ? upcoming.name
                : restToday
                  ? 'Rest day'
                  : '—'
          }
          hint={
            todayWorkout
              ? `Today · ${todayWorkout.routine_exercises.length} exercises`
              : upcoming && upcomingDate
                ? `${relativeDayLabel(upcomingDate)} · ${
                    upcoming.routine_exercises.length
                  } exercises`
                : routine
                  ? 'Nothing left this week'
                  : 'No routine yet'
          }
        />
      </div>

      <section className="mt-8">
        {!routine ? (
          <EmptyState />
        ) : todayWorkout ? (
          <div className="card flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted">Today · {DAY_NAMES[todayIndex]}</p>
              <h2 className="mt-0.5 text-xl font-semibold">
                {todayWorkout.name}
              </h2>
              <p className="mt-1 text-sm text-muted">
                {todayWorkout.routine_exercises
                  .slice(0, 4)
                  .map((e) => e.exercise_name)
                  .join(' · ')}
                {todayWorkout.routine_exercises.length > 4 &&
                  ` · +${todayWorkout.routine_exercises.length - 4} more`}
              </p>
            </div>
            <Link href={`/session/${todayWorkout.id}`} className="btn-primary">
              <Play className="size-4" />
              Start workout
            </Link>
          </div>
        ) : (
          <div className="card">
            <div className="text-center">
              <p className="font-medium">
                {restToday
                  ? 'Rest day — nothing scheduled.'
                  : doneToday
                    ? "Today's workout is done."
                    : upcoming
                      ? 'Nothing scheduled today.'
                      : 'Week complete.'}
              </p>
              <p className="mt-1 text-sm text-muted">
                {restToday
                  ? 'Recovery is part of the plan; your streak keeps going.'
                  : doneToday
                    ? 'Logged and counted. Enjoy the rest of the day.'
                    : upcoming
                      ? 'Take the day off, or move a session to today.'
                      : 'Everything scheduled this week is logged. Nice.'}
              </p>
            </div>

            {upcoming && upcomingDate && (
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-edge pt-4">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted uppercase tracking-wide">
                    Up next · {relativeDayLabel(upcomingDate)}
                  </p>
                  <p className="mt-0.5 truncate font-medium">{upcoming.name}</p>
                </div>
                {/* Deliberately not a start button — see todayWorkout above. */}
                <Link href="/plan" className="btn-ghost shrink-0">
                  <CalendarDays className="size-4" />
                  View plan
                </Link>
              </div>
            )}
          </div>
        )}
      </section>

      {weekSessions.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-semibold text-muted uppercase tracking-wide">
            This week
          </h2>
          <ul className="space-y-2">
            {weekSessions.map((session) => (
              <li
                key={session.id}
                className="flex items-center justify-between rounded-xl border border-edge bg-surface px-4 py-3"
              >
                <div>
                  <p className="font-medium">{session.name ?? 'Workout'}</p>
                  <p className="text-sm text-muted">
                    {fromDateKey(session.performed_on).toLocaleDateString(
                      undefined,
                      { weekday: 'long' },
                    )}
                  </p>
                </div>
                <span className="text-sm font-medium text-accent">
                  {formatVolume(Number(session.total_volume), unit)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  )
}

function StatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode
  label: string
  value: string
  hint: string
}) {
  return (
    <div className="card">
      <div className="flex items-center gap-2 text-muted">
        {icon}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <p className="mt-2 truncate text-2xl font-bold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted">{hint}</p>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="card flex flex-col items-center py-10 text-center">
      <span className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-accent/15">
        <Sparkles className="size-6 text-accent" />
      </span>
      <h2 className="text-lg font-semibold">No plan for this week yet</h2>
      <p className="mt-1 max-w-sm text-sm text-muted">
        Generate one from your preferences, or build your own. Either way it
        shows up here with your next workout ready to start.
      </p>
      <Link href="/plan" className="btn-primary mt-5">
        <Sparkles className="size-4" />
        Set up this week
      </Link>
    </div>
  )
}
