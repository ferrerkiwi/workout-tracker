import type { User } from '@supabase/supabase-js'

export const DEMO_COACH_REQUEST_LIMIT = 3

/** Supabase verifies this claim when resolving the authenticated user. */
export function isAnonymousUser(
  user: Pick<User, 'is_anonymous'> | null | undefined,
): boolean {
  return user?.is_anonymous === true
}
