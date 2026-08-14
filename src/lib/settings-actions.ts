'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type SettingsState = { error?: string; saved?: boolean }

export async function updateDisplayName(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const displayName = String(formData.get('display_name') ?? '').trim()
  if (!displayName) return { error: 'Name cannot be empty.' }

  const { error } = await supabase
    .from('profiles')
    .update({ display_name: displayName })
    .eq('id', user.id)
  if (error) return { error: error.message }

  revalidatePath('/settings')
  revalidatePath('/dashboard')
  return { saved: true }
}

/**
 * Clears training data and sends the user back through onboarding.
 *
 * This deliberately does not delete the auth account: removing the profile row
 * would leave a signed-in user with no profile and no way to recreate one,
 * since the profile trigger only fires on signup.
 */
export async function resetTrainingData(): Promise<SettingsState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // routine_days, routine_exercises and session_sets cascade from these.
  const { error: sessionsError } = await supabase
    .from('workout_sessions')
    .delete()
    .eq('user_id', user.id)
  if (sessionsError) return { error: sessionsError.message }

  const { error: routinesError } = await supabase
    .from('routines')
    .delete()
    .eq('user_id', user.id)
  if (routinesError) return { error: routinesError.message }

  const { error: prefsError } = await supabase
    .from('preferences')
    .delete()
    .eq('user_id', user.id)
  if (prefsError) return { error: prefsError.message }

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ onboarded_at: null })
    .eq('id', user.id)
  if (profileError) return { error: profileError.message }

  redirect('/onboarding')
}
