export const TIME_ZONE_COOKIE = 'rc-time-zone'

export function validTimeZone(value: string | undefined): string {
  try {
    if (value && value.length <= 100) {
      new Intl.DateTimeFormat('en', { timeZone: value }).format()
      return value
    }
  } catch { /* Unknown or malformed timezone: use a deterministic fallback. */ }
  return 'UTC'
}

export function dateKeyInTimeZone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: validTimeZone(timeZone), year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(date)
}

/** Establish the timezone before workout actions, including a first direct visit. */
export function syncBrowserTimeZone(): boolean {
  const zone = validTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone)
  const encoded = encodeURIComponent(zone)
  const current = document.cookie.split('; ').find((cookie) => cookie.startsWith(`${TIME_ZONE_COOKIE}=`))?.split('=')[1]
  if (current === encoded) return false
  document.cookie = `${TIME_ZONE_COOKIE}=${encoded}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`
  return true
}
