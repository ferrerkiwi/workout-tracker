export type AuthSource = 'login' | 'signup'

export const GOOGLE_AUTH_ERROR_PARAM = 'google_error'

const APP_ORIGIN = 'https://workout-tracker.local'

const GOOGLE_AUTH_ERROR_MESSAGES: Record<string, string> = {
  code_exchange_failed:
    'Google sign-in could not be completed. Please try again.',
  missing_code: 'Google did not return a sign-in code. Please try again.',
  oauth_cancelled: 'Google sign-in was cancelled.',
  oauth_start_failed: 'Google sign-in could not be started. Please try again.',
}

export function authSource(
  value: FormDataEntryValue | string | null,
): AuthSource {
  return value === 'signup' ? 'signup' : 'login'
}

export function authPageForSource(source: AuthSource) {
  return source === 'signup' ? '/signup' : '/login'
}

export function googleAuthErrorMessage(code: string | null) {
  if (!code) return null
  return (
    GOOGLE_AUTH_ERROR_MESSAGES[code] ??
    GOOGLE_AUTH_ERROR_MESSAGES.oauth_start_failed
  )
}

export function googleAuthErrorRedirect(source: AuthSource, code: string) {
  const params = new URLSearchParams({ [GOOGLE_AUTH_ERROR_PARAM]: code })
  return `${authPageForSource(source)}?${params.toString()}`
}

export function safeInternalPath(
  value: FormDataEntryValue | string | null,
  fallback = '/dashboard',
) {
  if (typeof value !== 'string') return fallback

  const path = value.trim()
  if (!path.startsWith('/') || path.startsWith('//')) return fallback

  try {
    const url = new URL(path, APP_ORIGIN)
    if (url.origin !== APP_ORIGIN) return fallback
    if (url.pathname === '/auth/callback') return fallback
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return fallback
  }
}
