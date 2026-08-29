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

  // The RPC makes this destructive workflow all-or-nothing. A network failure
  // cannot leave a user with half-deleted training data.
  const { error } = await supabase.rpc('reset_training_data')
  if (error) return { error: error.message }

  redirect('/onboarding')
}
