import Anthropic from '@anthropic-ai/sdk'
import type { ContentBlockParam, MessageParam } from '@anthropic-ai/sdk/resources'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import {
  ROUTINE_AGENT_MAX_HISTORY_CHARS,
  ROUTINE_AGENT_MAX_HISTORY_MESSAGES,
  ROUTINE_AGENT_MAX_INPUT_CHARS,
  ROUTINE_AGENT_MAX_TOKENS,
  ROUTINE_AGENT_MAX_TOOL_STEPS,
  ROUTINE_AGENT_MODEL,
  ROUTINE_AGENT_SYSTEM,
} from '@/lib/routine-agent-config'
import { loadRoutineAgentContext } from '@/lib/routine-agent-context'
import {
  executeRoutineAgentTool,
  routineAgentTools,
} from '@/lib/routine-agent-tools'
import { createClient } from '@/lib/supabase/server'

const requestSchema = z
  .object({
    message: z.string().trim().min(1).max(ROUTINE_AGENT_MAX_INPUT_CHARS),
    history: z
      .array(
        z.object({
          role: z.enum(['user', 'assistant']),
          content: z.string().trim().min(1).max(ROUTINE_AGENT_MAX_HISTORY_CHARS),
        }),
      )
      .max(ROUTINE_AGENT_MAX_HISTORY_MESSAGES)
      .default([]),
  })
  .strict()

export async function POST(request: Request) {
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
      { error: 'ANTHROPIC_API_KEY is not configured.' },
      { status: 500 },
    )
  }

  const body = await request.json().catch(() => null)
  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Message is missing or too long.' },
      { status: 400 },
    )
  }

  let context = await loadRoutineAgentContext(supabase, user.id)
  if (!context.routine) {
    return NextResponse.json(
      { error: 'Create a weekly routine before asking the coach.' },
      { status: 400 },
    )
  }

  const anthropic = new Anthropic({ apiKey })
  const messages: MessageParam[] = [
    ...parsed.data.history.slice(-ROUTINE_AGENT_MAX_HISTORY_MESSAGES).map(
      (message): MessageParam => ({
        role: message.role,
        content: message.content,
      }),
    ),
    {
      role: 'user',
      content: userMessageWithContext(context.text, parsed.data.message),
    },
  ]

  let routineChanged = false

  try {
    for (let step = 0; step < ROUTINE_AGENT_MAX_TOOL_STEPS; step++) {
      const response = await anthropic.messages.create({
        model: ROUTINE_AGENT_MODEL,
        max_tokens: ROUTINE_AGENT_MAX_TOKENS,
        system: ROUTINE_AGENT_SYSTEM,
        messages,
        tools: routineAgentTools,
        tool_choice: { type: 'auto', disable_parallel_tool_use: true },
        metadata: { user_id: user.id },
      })

      const toolUses = response.content.filter((block) => block.type === 'tool_use')
      if (toolUses.length === 0) {
        const message = textFromBlocks(response.content)
        if (!message) {
          return NextResponse.json(
            { error: 'The coach returned no usable response.' },
            { status: 502 },
          )
        }
        return NextResponse.json({ message, routineChanged })
      }

      messages.push({ role: 'assistant', content: response.content })

      const toolResults: ContentBlockParam[] = []
      for (const toolUse of toolUses) {
        const result = await executeRoutineAgentTool(
          supabase,
          toolUse.name,
          toolUse.input,
        )
        routineChanged = routineChanged || result.routineChanged

        if (result.routineChanged) {
          context = await loadRoutineAgentContext(supabase, user.id)
        }

        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          is_error: !result.ok,
          content: JSON.stringify({
            ok: result.ok,
            message: result.message,
            currentRoutineContext: context.text,
          }),
        })
      }

      messages.push({ role: 'user', content: toolResults })
    }

    return NextResponse.json(
      {
        error:
          'The coach tried too many routine edits at once. Please try a smaller request.',
      },
      { status: 502 },
    )
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      if (error.status === 400 && /credit balance/i.test(error.message)) {
        return NextResponse.json(
          { error: 'The Anthropic account is out of credits.' },
          { status: 402 },
        )
      }
      if (error.status === 401) {
        return NextResponse.json(
          { error: 'ANTHROPIC_API_KEY is invalid.' },
          { status: 401 },
        )
      }
      if (error.status === 429) {
        return NextResponse.json(
          { error: 'The coach is rate limited. Try again in a moment.' },
          { status: 429 },
        )
      }

      console.error('Routine agent Anthropic error', {
        status: error.status,
        message: error.message,
      })
      return NextResponse.json(
        { error: 'The coach could not respond right now.' },
        { status: 502 },
      )
    }

    console.error('Routine agent error', error)
    return NextResponse.json(
      { error: 'The coach could not respond right now.' },
      { status: 500 },
    )
  }
}

function userMessageWithContext(context: string, message: string) {
  return [
    'Current authoritative routine context:',
    '<routine_context>',
    context,
    '</routine_context>',
    '',
    'User message:',
    message,
  ].join('\n')
}

function textFromBlocks(blocks: Anthropic.Message['content']) {
  return blocks
    .filter((block) => block.type === 'text')
    .map((block) => block.text.trim())
    .filter(Boolean)
    .join('\n\n')
}
