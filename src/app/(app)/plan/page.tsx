import { redirect } from 'next/navigation'
import { PlanEditor } from '@/components/plan-editor'
import { PlanFooterActions } from '@/components/plan-footer-actions'
import { PlanStart } from '@/components/plan-start'
import type { PreferenceFact } from '@/components/preferences-summary'
import { RoutineCoach } from '@/components/routine-coach'
import { experienceLabel, goalLabels } from '@/lib/constants'
import { getPreferences, getProfile, getRoutineForWeek } from '@/lib/queries'
import { getAuthenticatedServerClient } from '@/lib/supabase/server'
import { startOfWeek, toDateKey, today } from '@/lib/week'

export default async function PlanPage() {
  const { supabase, user } = await getAuthenticatedServerClient()
  if (!user) redirect('/login')

  const weekStart = startOfWeek(today())
  const weekStartKey = toDateKey(weekStart)

  const [profile, preferences, routine] = await Promise.all([
    getProfile(supabase, user.id),
    getPreferences(supabase, user.id),
    getRoutineForWeek(supabase, user.id, weekStartKey),
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
        <p className="mt-1.5 text-muted">
          Week of{' '}
          {weekStart.toLocaleDateString(undefined, {
            month: 'long',
            day: 'numeric',
          })}
          {routine && ' · changes save as soon as you leave a field'}
        </p>
      </header>

      {!routine ? (
        <div className="max-w-3xl">
          <PlanStart facts={facts} hasPreferences={Boolean(preferences)} />
        </div>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="min-w-0">
            <PlanEditor routine={routine} unit={unit} />
            <PlanFooterActions
              canGenerate={Boolean(preferences)}
              facts={facts}
            />
          </div>
          <RoutineCoach />
        </div>
      )}
    </main>
  )
}
