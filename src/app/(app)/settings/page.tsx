import { redirect } from 'next/navigation'
import {
  EMPTY_PREFERENCES,
  PreferencesForm,
  type PreferencesDefaults,
} from '@/components/preferences-form'
import {
  DangerZonePanel,
  DisplayNamePanel,
  SignOutPanel,
} from '@/components/settings-panels'
import { isAnonymousUser } from '@/lib/demo'
import { getPreferences, getProfile } from '@/lib/queries'
import { getAuthenticatedServerClient } from '@/lib/supabase/server'

export default async function SettingsPage() {
  const { supabase, user } = await getAuthenticatedServerClient()
  if (!user) redirect('/login')

  const [profile, preferences] = await Promise.all([
    getProfile(supabase, user.id),
    getPreferences(supabase, user.id),
  ])

  const defaults: PreferencesDefaults = preferences
    ? {
        goals: preferences.goals,
        experience_level: preferences.experience_level,
        days_per_week: preferences.days_per_week,
        session_length_min: preferences.session_length_min,
        equipment: preferences.equipment,
        focus_muscles: preferences.focus_muscles,
        limitations: preferences.limitations ?? '',
        unit_preference: profile?.unit_preference ?? 'lbs',
      }
    : { ...EMPTY_PREFERENCES, unit_preference: profile?.unit_preference ?? 'lbs' }
  const isDemo = isAnonymousUser(user)

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-8 sm:py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="mt-1.5 text-muted">
          {isDemo ? (
            'Demo mode · changes are temporary.'
          ) : (
            <>
              Signed in as <span className="text-foreground">{user.email}</span>
            </>
          )}
        </p>
      </header>

      <div className="space-y-4">
        <DisplayNamePanel initial={profile?.display_name ?? ''} />

        <div>
          <h2 className="mb-3 text-sm font-semibold text-muted">
            Training preferences
          </h2>
          <p className="mb-4 text-sm text-muted">
            These drive routine generation. Changing them affects your next
            generated routine. Changing units also converts your current plan weights.
          </p>
          <PreferencesForm
            mode="settings"
            defaults={defaults}
            submitLabel="Save preferences"
          />
        </div>

        <SignOutPanel />
        {!isDemo && <DangerZonePanel />}
      </div>
    </main>
  )
}
