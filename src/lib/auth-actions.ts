'use server'

import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { authSource, safeInternalPath } from '@/lib/auth-redirect'
import { createClient } from '@/lib/supabase/server'
import { REMEMBER_COOKIE, REMEMBER_MAX_AGE } from '@/lib/supabase/remember'

export type AuthState = { error?: string; notice?: string }

/**
 * Record the remember-me choice *before* signing in, so the auth cookies
 * Supabase writes during sign-in already honour it.
 */
async function setRememberChoice(remember: boolean) {
  const cookieStore = await cookies()
  cookieStore.set(REMEMBER_COOKIE, remember ? '1' : '0', {
    path: '/',
    sameSite: 'lax',
    maxAge: REMEMBER_MAX_AGE,
  })
}

async function getRequestOrigin() {
  const headerStore = await headers()
  const host = headerStore.get('x-forwarded-host') ?? headerStore.get('host')
  const proto =
    headerStore.get('x-forwarded-proto') ??
    (host?.startsWith('localhost') || host?.startsWith('127.0.0.1')
      ? 'http'
      : 'https')

  if (host) return `${proto}://${host}`

  const origin = headerStore.get('origin')
  if (origin) return origin

  return process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
}

export async function login(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  const remember = formData.get('remember') === 'on'

  if (!email || !password) return { error: 'Email and password are required.' }

  await setRememberChoice(remember)

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) return { error: error.message }

  redirect('/dashboard')
}

export async function signup(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  const displayName = String(formData.get('display_name') ?? '').trim()

  if (!email || !password) return { error: 'Email and password are required.' }
  if (password.length < 8) {
    return { error: 'Password must be at least 8 characters.' }
  }

  // New accounts are remembered by default.
  await setRememberChoice(true)

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  })

  if (error) return { error: error.message }

  // With email confirmation enabled there is no session yet.
  if (!data.session) {
    return { notice: 'Check your email to confirm your account, then log in.' }
  }

  redirect('/onboarding')
}

export async function continueWithGoogle(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const source = authSource(formData.get('source'))
  const next = safeInternalPath(formData.get('next'))
  const origin = await getRequestOrigin()
  const callbackUrl = new URL('/auth/callback', origin)

  callbackUrl.searchParams.set('source', source)
  callbackUrl.searchParams.set('next', next)

  // OAuth should follow the app's default persistent-login behavior.
  await setRememberChoice(true)

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: callbackUrl.toString(),
    },
  })

  if (error || !data.url) {
    return {
      error: 'Google sign-in could not be started. Please try again.',
    }
  }

  redirect(data.url)
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
