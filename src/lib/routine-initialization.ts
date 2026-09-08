import { getRoutineForWeek, type Client, type Routine } from '@/lib/queries'
import { startOfWeek, toDateKey, today } from '@/lib/week'

/**
 * Ensures that the signed-in user's current week has its own routine snapshot.
 * The RPC is deliberately explicit about writing; regular routine queries stay
 * read-only so historical week browsing cannot create data by accident.
 */
export async function ensureCurrentRoutine(
  supabase: Client,
  userId: string,
): Promise<Routine | null> {
  const weekStart = toDateKey(startOfWeek(today()))
  const { error } = await supabase.rpc('ensure_current_weekly_routine', {
    p_week_start_date: weekStart,
  })

  if (error) {
    throw new Error(`Unable to initialize this week's plan: ${error.message}`)
  }

  return getRoutineForWeek(supabase, userId, weekStart)
}
