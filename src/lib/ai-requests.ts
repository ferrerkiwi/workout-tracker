import type { Client } from '@/lib/queries'
import type { Json } from '@/lib/database.types'

export type AIResponse = { message?: string; error?: string; routineChanged?: boolean; [key: string]: unknown }

export async function acquireAIRequest(supabase: Client, feature: 'coach' | 'generation', requestId: string) {
  const { data, error } = await supabase.rpc('acquire_ai_request', { p_feature: feature, p_request_id: requestId })
  if (error) return { error: error.code === 'P0001' ? error.message : 'AI service is unavailable. Please try again later.', status: error.code === 'P0001' ? 429 : 503 }
  return data as { leaseId?: string; cached?: AIResponse }
}

export async function recordAIResponse(supabase: Client, leaseId: string, response: AIResponse, finished = true) {
  const { error } = await supabase.rpc('record_ai_response', {
    p_lease_id: leaseId, p_response: response as Json, p_finished: finished,
  })
  if (error) throw new Error('Could not record the AI response.')
}
