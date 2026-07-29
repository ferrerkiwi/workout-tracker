import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { fallbackTemplates } from '@/lib/ai-fallback'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Define the expected request body
type GenerateRequest = {
  goals: string
  equipment_limitations: string[]
  comfort_levels: string[]
  target_muscle_groups: string[] // e.g., ["Chest", "Triceps"]
}

export async function POST(req: Request) {
  try {
    const body: GenerateRequest = await req.json()
    
    // Quick validation
    if (!body.goals || !body.target_muscle_groups) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    // If no API key, use fallback
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key') {
      console.warn("OpenAI API key missing or invalid. Using fallback templates.")
      const fallbackKey = body.goals.toLowerCase() === 'strength' ? 'strength' : 'hypertrophy'
      return NextResponse.json(fallbackTemplates[fallbackKey] || fallbackTemplates['hypertrophy'])
    }

    const systemPrompt = `You are a world-class hypertrophy and strength coach AI. Your task is to generate a highly structured workout routine.
CRITICAL CONSTRAINTS:
1. Equipment Available: ${body.equipment_limitations.length > 0 ? body.equipment_limitations.join(', ') : 'All standard gym equipment'}
2. Comfort Levels/Limitations: ${body.comfort_levels.length > 0 ? body.comfort_levels.join(', ') : 'None'}
3. Primary Goal: ${body.goals}
4. Target Muscle Groups Today: ${body.target_muscle_groups.join(', ')}

RULES:
- ONLY prescribe exercises using the Equipment Available.
- ADHERE strictly to the Comfort Levels (e.g. if avoiding heavy axial loading, do not prescribe barbell squats).
- You MUST include a distinct, customized warm-up tailored EXCLUSIVELY to the target muscle groups (NO generic full-body warm-ups).
- You MUST return a strict JSON object matching the requested schema. No markdown, no explanations outside the JSON.`

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Generate today's workout routine based on my constraints." }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "workout_routine",
          strict: true,
          schema: {
            type: "object",
            properties: {
              name: { type: "string" },
              muscle_groups_targeted: { 
                type: "array", 
                items: { type: "string" } 
              },
              notes: { type: "string" },
              exercises: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    order_index: { type: "number" },
                    type: { type: "string", enum: ["warmup", "strength", "cooldown"] },
                    recommended_sets: { type: "number" },
                    recommended_reps: { type: "string" },
                    notes: { type: "string" }
                  },
                  required: ["name", "order_index", "type", "recommended_sets", "recommended_reps", "notes"],
                  additionalProperties: false
                }
              }
            },
            required: ["name", "muscle_groups_targeted", "notes", "exercises"],
            additionalProperties: false
          }
        }
      }
    })

    const resultText = completion.choices[0].message.content
    if (!resultText) {
      throw new Error("Empty response from OpenAI")
    }

    const routine = JSON.parse(resultText)
    return NextResponse.json(routine)

  } catch (error) {
    console.error("AI Generation Error:", error)
    // Fallback on error
    return NextResponse.json(fallbackTemplates['hypertrophy'], { status: 200, headers: { 'X-Fallback-Deployed': 'true' } })
  }
}
