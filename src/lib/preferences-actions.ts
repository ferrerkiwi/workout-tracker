'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { GOAL_VALUES } from '@/lib/constants'
import { createClient } from '@/lib/supabase/server'

export type PreferencesState = { error?: string; saved?: boolean }

export async function savePreferences(
  _prev: PreferencesState,
  formData: FormData,
): Promise<PreferencesState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const mode = String(formData.get('mode') ?? 'settings')
  const goals = formData.getAll('goals').map(String)
  const experience = String(formData.get('experience_level') ?? '')
  // Null means the generator chooses the training frequency.
  const aiPicksDays = formData.get('ai_picks_days') === 'on'
  const daysPerWeek = aiPicksDays ? null : Number(formData.get('days_per_week'))
  const aiPicksLength = formData.get('ai_picks_length') === 'on'
  const sessionLength = aiPicksLength
    ? null
    : Number(formData.get('session_length_min'))
  const equipment = formData.getAll('equipment').map(String)
  const focusMuscles = formData.getAll('focus_muscles').map(String)
  const limitations = String(formData.get('limitations') ?? '').trim()
  const units = String(formData.get('unit_preference') ?? 'lbs')

  if (goals.length === 0) return { error: 'Pick at least one goal.' }
  if (goals.some((g) => !GOAL_VALUES.includes(g))) {
    return { error: 'One of those goals is not recognised.' }
  }
  if (!experience) return { error: 'Pick an experience level.' }
  if (
    daysPerWeek !== null &&
    (!Number.isFinite(daysPerWeek) || daysPerWeek < 1 || daysPerWeek > 7)
  ) {
    return { error: 'Training days must be between 1 and 7.' }
  }
  if (
    sessionLength !== null &&
    (!Number.isFinite(sessionLength) || sessionLength < 10 || sessionLength > 240)
  ) {
    return { error: 'Session length must be between 10 and 240 minutes.' }
  }
  if (equipment.length === 0) {
    return { error: 'Select at least one equipment option.' }
  }

  const { error: prefError } = await supabase.from('preferences').upsert(
    {
      user_id: user.id,
      goals,
      experience_level: experience,
      days_per_week: daysPerWeek,
      session_length_min: sessionLength,
      equipment,
      focus_muscles: focusMuscles,
      limitations: limitations || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  )
  if (prefError) return { error: prefError.message }

  const profileUpdate: {
    unit_preference: string
    onboarded_at?: string
  } = { unit_preference: units === 'kg' ? 'kg' : 'lbs' }

  // onboarded_at records when onboarding was completed, so it is stamped once
  // and left alone when preferences are edited later from settings.
  if (mode === 'onboarding') {
    profileUpdate.onboarded_at = new Date().toISOString()
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .update(profileUpdate)
    .eq('id', user.id)
  if (profileError) return { error: profileError.message }

  if (mode === 'onboarding') redirect('/plan')

  revalidatePath('/settings')
  revalidatePath('/dashboard')
  return { saved: true }
}
