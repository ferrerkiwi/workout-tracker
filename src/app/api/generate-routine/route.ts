import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { acquireAIRequest, recordAIResponse } from '@/lib/ai-requests'
import { generatedRoutineSchema, routineInputSchema, normaliseDays } from '@/lib/routine-schema'
import { isAnonymousUser } from '@/lib/demo'
import { getPreferences, getProfile } from '@/lib/queries'
import {
  buildRoutineUserPrompt,
  ROUTINE_MODEL as MODEL,
  ROUTINE_PROMPT_VERSION as PROMPT_VERSION,
  ROUTINE_SYSTEM as SYSTEM,
} from '@/lib/routine-prompt'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 90

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  }
  if (isAnonymousUser(user)) {
    return NextResponse.json(
      {
        error:
          'Demo mode includes a ready-made routine. Use Routine Coach to explore focused plan edits.',
      },
      { status: 403 },
    )
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          'ANTHROPIC_API_KEY is not set. Add it to .env.local and restart the dev server.',
      },
      { status: 500 },
    )
  }

  const [preferences, profile] = await Promise.all([
    getPreferences(supabase, user.id),
    getProfile(supabase, user.id),
  ])

  if (!preferences) {
    return NextResponse.json(
      { error: 'Set your preferences before generating a routine.' },
      { status: 400 },
    )
  }

  const unit = profile?.unit_preference ?? 'lbs'

  const userPrompt = buildRoutineUserPrompt({
    goals: preferences.goals,
    experience_level: preferences.experience_level,
    days_per_week: preferences.days_per_week,
    session_length_min: preferences.session_length_min,
    equipment: preferences.equipment,
    focus_muscles: preferences.focus_muscles,
    limitations: preferences.limitations,
    unit,
  })

  const parsedRequest = z.object({ requestId: z.string().uuid() }).safeParse(await request.json().catch(() => null))
  if (!parsedRequest.success) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  const lease = await acquireAIRequest(supabase, 'generation', parsedRequest.data.requestId)
  if ('error' in lease) return NextResponse.json({ error: lease.error }, { status: lease.status })
  if (lease.cached) return NextResponse.json(lease.cached, { status: lease.cached.error ? 502 : 200 })
  const leaseId = lease.leaseId!
  const anthropic = new Anthropic({ apiKey, maxRetries: 0, timeout: 60_000 })
  let recorded = false

  try {
    const message = await anthropic.messages.parse({
      model: MODEL,
      max_tokens: 8000,
      system: SYSTEM,
      messages: [{ role: 'user', content: userPrompt }],
      output_config: { format: zodOutputFormat(generatedRoutineSchema) },
    })

    const validated = routineInputSchema.safeParse(message.parsed_output)
    const parsed = validated.success ? validated.data : null
    if (!parsed) {
      return NextResponse.json(
        { error: 'The model returned an unreadable routine. Try again.' },
        { status: 502 },
      )
    }

    const response = {
      routine: { ...parsed, days: normaliseDays(parsed.days) },
      model: MODEL,
      promptVersion: PROMPT_VERSION,
      usage: {
        input_tokens: message.usage.input_tokens,
        output_tokens: message.usage.output_tokens,
      },
    }
    await recordAIResponse(supabase, leaseId, response)
    recorded = true
    return NextResponse.json(response)
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      // Billing and auth problems are actionable by the operator, so say what
      // to do rather than surfacing a raw upstream error.
      if (error.status === 400 && /credit balance/i.test(error.message)) {
        return NextResponse.json(
          {
            error:
              'Your Anthropic account is out of credits. Add some at ' +
              'console.anthropic.com under Plans & Billing, then try again.',
          },
          { status: 402 },
        )
      }
      if (error.status === 401) {
        return NextResponse.json(
          { error: 'ANTHROPIC_API_KEY is invalid. Check .env.local.' },
          { status: 401 },
        )
      }
      if (error.status === 429) {
        return NextResponse.json(
          { error: 'Rate limited by the Anthropic API. Wait a moment and retry.' },
          { status: 429 },
        )
      }
      return NextResponse.json(
        { error: `Anthropic API error (${error.status}): ${error.message}` },
        { status: 502 },
      )
    }
    console.error('Routine generation failed', error instanceof Error ? error.name : 'Unknown error')
    return NextResponse.json({ error: 'Could not generate a routine. Please try again.' }, { status: 502 })
  } finally {
    if (!recorded) await recordAIResponse(supabase, leaseId, { error: 'Generation did not complete. Send a new request to try again.' }).catch(() => undefined)
  }
}
