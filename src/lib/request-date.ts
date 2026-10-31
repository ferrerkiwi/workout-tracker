import { cookies } from 'next/headers'
import { TIME_ZONE_COOKIE, dateKeyInTimeZone, validTimeZone } from './time-zone'
import { fromDateKey } from './week'

export async function getRequestTimeZone() {
  const value = (await cookies()).get(TIME_ZONE_COOKIE)?.value
  try { return validTimeZone(value ? decodeURIComponent(value) : undefined) }
  catch { return 'UTC' }
}

export async function getUserToday() {
  return fromDateKey(dateKeyInTimeZone(new Date(), await getRequestTimeZone()))
}
