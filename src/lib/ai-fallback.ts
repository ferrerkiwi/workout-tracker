export type ExerciseSubroutine = {
  name: string
  order_index: number
  type: 'warmup' | 'strength' | 'cooldown'
  recommended_sets: number
  recommended_reps: string
  notes?: string
}

export type WorkoutRoutine = {
  name: string
  muscle_groups_targeted: string[]
  exercises: ExerciseSubroutine[]
  notes?: string
}

export const fallbackTemplates: Record<string, WorkoutRoutine> = {
  hypertrophy: {
    name: "Baseline Hypertrophy Push",
    muscle_groups_targeted: ["Chest", "Shoulders", "Triceps"],
    exercises: [
      { name: "Arm Circles & Dynamic Chest Stretch", order_index: 0, type: "warmup", recommended_sets: 1, recommended_reps: "10-15 reps" },
      { name: "Dumbbell Bench Press", order_index: 1, type: "strength", recommended_sets: 4, recommended_reps: "8-12", notes: "Focus on slow eccentric" },
      { name: "Incline Machine Press", order_index: 2, type: "strength", recommended_sets: 3, recommended_reps: "10-15" },
      { name: "Cable Lateral Raises", order_index: 3, type: "strength", recommended_sets: 4, recommended_reps: "15-20", notes: "Constant tension" },
      { name: "Triceps Pushdown", order_index: 4, type: "strength", recommended_sets: 3, recommended_reps: "10-15" },
      { name: "Light Static Stretching", order_index: 5, type: "cooldown", recommended_sets: 1, recommended_reps: "60s" }
    ],
    notes: "Fallback template deployed due to AI unavailability. Focus on mind-muscle connection."
  },
  strength: {
    name: "Baseline Strength Lower",
    muscle_groups_targeted: ["Quads", "Hamstrings", "Glutes"],
    exercises: [
      { name: "Leg Swings & Bodyweight Squats", order_index: 0, type: "warmup", recommended_sets: 2, recommended_reps: "15 reps" },
      { name: "Barbell Squat", order_index: 1, type: "strength", recommended_sets: 5, recommended_reps: "3-5", notes: "Heavy compound, 3-5 min rest" },
      { name: "Leg Press", order_index: 2, type: "strength", recommended_sets: 3, recommended_reps: "6-8" },
      { name: "Seated Leg Curl", order_index: 3, type: "strength", recommended_sets: 3, recommended_reps: "8-10" },
      { name: "Walking Lunges", order_index: 4, type: "cooldown", recommended_sets: 2, recommended_reps: "10 per leg" }
    ],
    notes: "Fallback template deployed. Maintain strict form on heavy compounds."
  }
}
