import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { NextResponse } from 'next/server'
import { generatedRoutineSchema, normaliseDays } from '@/lib/routine-schema'
import { getPreferences, getProfile } from '@/lib/queries'
import {
  buildRoutineUserPrompt,
  ROUTINE_MODEL as MODEL,
  ROUTINE_PROMPT_VERSION as PROMPT_VERSION,
  ROUTINE_SYSTEM as SYSTEM,
} from '@/lib/routine-prompt'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
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

  const anthropic = new Anthropic({ apiKey })

  try {
    const message = await anthropic.messages.parse({
      model: MODEL,
      max_tokens: 8000,
      system: SYSTEM,
      messages: [{ role: 'user', content: userPrompt }],
      output_config: { format: zodOutputFormat(generatedRoutineSchema) },
    })

    const parsed = message.parsed_output
    if (!parsed) {
      return NextResponse.json(
        { error: 'The model returned an unreadable routine. Try again.' },
        { status: 502 },
      )
    }

    return NextResponse.json({
      routine: { ...parsed, days: normaliseDays(parsed.days) },
      model: MODEL,
      promptVersion: PROMPT_VERSION,
      usage: {
        input_tokens: message.usage.input_tokens,
        output_tokens: message.usage.output_tokens,
      },
    })
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
    throw error
  }
}
