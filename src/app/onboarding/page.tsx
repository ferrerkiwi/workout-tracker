import { redirect } from 'next/navigation'
import {
  EMPTY_PREFERENCES,
  PreferencesForm,
} from '@/components/preferences-form'
import { createClient } from '@/lib/supabase/server'

export default async function OnboardingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .maybeSingle()

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-12">
      <header className="mb-8">
        <p className="text-sm font-medium text-accent">Getting set up</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">
          {profile?.display_name ? `Hi ${profile.display_name}.` : 'Hi.'} Tell me
          how you train.
        </h1>
        <p className="mt-2 text-muted">
          These answers are the parameters your routine gets generated from. You
          can change any of them later in settings.
        </p>
      </header>

      <PreferencesForm
        mode="onboarding"
        defaults={EMPTY_PREFERENCES}
        submitLabel="Save and continue"
      />
    </main>
  )
}
