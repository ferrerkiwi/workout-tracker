import { redirect } from 'next/navigation'
import { PlanEditor } from '@/components/plan-editor'
import { PlanFooterActions } from '@/components/plan-footer-actions'
import { PlanStart } from '@/components/plan-start'
import type { PreferenceFact } from '@/components/preferences-summary'
import { RoutineCoach } from '@/components/routine-coach'
import { WeekNavigator } from '@/components/week-navigator'
import { experienceLabel, goalLabels } from '@/lib/constants'
import {
  getPreferences,
  getProfile,
  getRoutineForWeek,
} from '@/lib/queries'
import { ensureCurrentRoutine } from '@/lib/routine-initialization'
import { getAuthenticatedServerClient } from '@/lib/supabase/server'
import {
  normaliseWeekStartParam,
  startOfWeek,
  toDateKey,
  today,
} from '@/lib/week'

export default async function PlanPage({ searchParams }: PageProps<'/plan'>) {
  const { supabase, user } = await getAuthenticatedServerClient()
  if (!user) redirect('/login')

  const currentWeekStart = startOfWeek(today())
  const currentWeekStartKey = toDateKey(currentWeekStart)
  const requestedWeek = normaliseWeekStartParam((await searchParams).week)
  const weekStartKey = requestedWeek ?? currentWeekStartKey
  const isCurrentWeek = weekStartKey === currentWeekStartKey
  const isPastWeek = weekStartKey < currentWeekStartKey

  const [profile, preferences, routine] = await Promise.all([
    getProfile(supabase, user.id),
    getPreferences(supabase, user.id),
    isCurrentWeek
      ? ensureCurrentRoutine(supabase, user.id)
      : getRoutineForWeek(supabase, user.id, weekStartKey),
  ])

  const unit = profile?.unit_preference ?? 'lbs'

  const facts: PreferenceFact[] = preferences
    ? [
        ['Goals', goalLabels(preferences.goals)],
        ['Experience', experienceLabel(preferences.experience_level)],
        [
          'Days per week',
          preferences.days_per_week === null
            ? 'Up to the AI'
            : String(preferences.days_per_week),
        ],
        [
          'Session length',
          preferences.session_length_min === null
            ? 'Up to the AI'
            : `${preferences.session_length_min} min`,
        ],
        ['Equipment', preferences.equipment.join(', ') || '—'],
        ['Focus', preferences.focus_muscles.join(', ') || 'Balanced'],
        ['Limitations', preferences.limitations || 'None'],
      ]
    : []

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-8 pb-14 sm:px-8 sm:py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Weekly plan</h1>
        <WeekNavigator
          weekStart={weekStartKey}
          currentWeekStart={currentWeekStartKey}
        />
        <p className="mt-3 text-muted">
          {isPastWeek
            ? 'Past week - read only'
            : isCurrentWeek
              ? routine
                ? 'Changes save as soon as you leave a field.'
                : 'No plan for this week yet.'
              : 'Future week - read only'}
        </p>
      </header>

      {!routine ? (
        <div className="max-w-3xl">
          {isCurrentWeek ? (
            <PlanStart
              facts={facts}
              hasPreferences={Boolean(preferences)}
            />
          ) : (
            <div className="card text-center">
              <p className="font-medium">
                {isPastWeek
                  ? 'No plan was created for this week.'
                  : 'This week has not started yet.'}
              </p>
              <p className="mt-1 text-sm text-muted">
                {isPastWeek
                  ? 'Historical weeks are preserved exactly as they were planned.'
                  : 'Plans can be created once this becomes the current week.'}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="min-w-0">
            <PlanEditor routine={routine} unit={unit} readOnly={!isCurrentWeek} />
            {isCurrentWeek && (
              <PlanFooterActions
                canGenerate={Boolean(preferences)}
                facts={facts}
              />
            )}
          </div>
          {isCurrentWeek && <RoutineCoach />}
        </div>
      )}
    </main>
  )
}
