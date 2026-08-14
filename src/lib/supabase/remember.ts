/**
 * "Remember me" support.
 *
 * Supabase always writes its auth cookies with a long `maxAge`. To make a
 * login last only until the browser closes, we strip `maxAge`/`expires` so
 * the browser treats them as session cookies and discards them on quit.
 *
 * The choice itself is stored in a separate, non-sensitive marker cookie so
 * that every later token refresh keeps honouring it.
 */
export const REMEMBER_COOKIE = 'wt-remember'

/** One year, in seconds. */
export const REMEMBER_MAX_AGE = 60 * 60 * 24 * 365

type CookieOptions = Record<string, unknown> & {
  maxAge?: number
  expires?: Date
}

/** Returns cookie options honouring the user's remember-me choice. */
export function withRemember(
  options: CookieOptions | undefined,
  remember: boolean,
): CookieOptions {
  const opts = { ...(options ?? {}) }
  if (remember) return opts

  // Session cookie: no maxAge, no expires.
  delete opts.maxAge
  delete opts.expires
  return opts
}

/** Reads the marker cookie. Defaults to `true` — remembering is the default. */
export function readRemember(value: string | undefined): boolean {
  return value !== '0'
}
