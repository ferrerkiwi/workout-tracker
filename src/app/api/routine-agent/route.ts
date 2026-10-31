import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { coachRequestSchema } from '@/lib/coach-request'
import { acquireAIRequest, recordAIResponse } from '@/lib/ai-requests'
import { runCoach } from '@/lib/coach-runner'
import {
  ROUTINE_AGENT_MAX_TOKENS, ROUTINE_AGENT_MAX_TOOL_STEPS,
  ROUTINE_AGENT_MODEL, ROUTINE_AGENT_SYSTEM,
} from '@/lib/routine-agent-config'
import { loadRoutineAgentContext } from '@/lib/routine-agent-context'
import { executeRoutineAgentTool, routineAgentTools } from '@/lib/routine-agent-tools'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 120

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'The coach is unavailable right now.' }, { status: 503 })
  // Reject oversized bodies before JSON/schema processing.
  const text = await request.text()
  if (text.length > 180_000) return NextResponse.json({ error: 'Request is too large.' }, { status: 413 })
  let body: unknown
  try { body = JSON.parse(text) } catch { body = null }
  const parsed = coachRequestSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Message is missing or too long.' }, { status: 400 })
  const context = await loadRoutineAgentContext(supabase, user.id)
  if (!context.routine) return NextResponse.json({ error: 'Create a routine before asking the coach.' }, { status: 400 })
  const lease = await acquireAIRequest(supabase, 'coach', parsed.data.requestId)
  if ('error' in lease) return NextResponse.json({ error: lease.error }, { status: lease.status })
  if (lease.cached) return NextResponse.json(lease.cached, { status: lease.cached.error ? 502 : 200 })
  const leaseId = lease.leaseId!
  const anthropic = new Anthropic({ apiKey, maxRetries: 0, timeout: 30_000 })
  const result = await runCoach({
    messages: [...parsed.data.history, { role: 'user', content: `Current authoritative routine context:\n<routine_context>\n${context.text}\n</routine_context>\n\nUser message:\n${parsed.data.message}` }],
    maxSteps: ROUTINE_AGENT_MAX_TOOL_STEPS,
    onError: (error) => console.error('Routine coach request failed', error instanceof Anthropic.APIError ? { status: error.status, message: error.message } : error instanceof Error ? error.name : 'Unknown error'),
    respond: async (messages) => (await anthropic.messages.create({
      model: ROUTINE_AGENT_MODEL, max_tokens: ROUTINE_AGENT_MAX_TOKENS,
      system: ROUTINE_AGENT_SYSTEM, messages, tools: routineAgentTools,
      tool_choice: { type: 'auto', disable_parallel_tool_use: true }, metadata: { user_id: user.id },
    })).content,
    execute: (name, input) => executeRoutineAgentTool(supabase, name, input),
    refreshContext: async () => (await loadRoutineAgentContext(supabase, user.id)).text,
    checkpoint: (result) => recordAIResponse(supabase, leaseId, result, false),
  })
  try { await recordAIResponse(supabase, leaseId, result) }
  catch { return NextResponse.json({ ...result, error: result.error ?? 'Your request finished, but its response could not be recorded. Review your plan before retrying.' }, { status: 503 }) }
  return NextResponse.json(result, { status: result.error ? 502 : 200 })
}
