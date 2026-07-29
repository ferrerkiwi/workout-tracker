'use client'

import { useState, useEffect } from 'react'
import { Database as DatabaseIcon, RefreshCw, Trophy, Target } from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type ExerciseStats = {
  name: string
  maxWeight: number
  totalSets: number
  totalReps: number
}

export default function DatabasePage() {
  const router = useRouter()
  const [stats, setStats] = useState<ExerciseStats[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchDatabase = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Fetch all workouts for user with nested exercises and sets
      const { data: workoutsData, error } = await supabase
        .from('workouts')
        .select(`
          user_id,
          workout_exercises (
            exercise_name,
            sets (
              reps,
              weight_lbs,
              completed
            )
          )
        `)
        .eq('user_id', user.id)

      if (error || !workoutsData) {
        console.error("Error fetching database", error)
        setIsLoading(false)
        return
      }

      // Aggregate stats
      const aggregated: Record<string, ExerciseStats> = {}

      workoutsData.forEach((workout: any) => {
        workout.workout_exercises.forEach((ex: any) => {
          const name = ex.exercise_name
          if (!aggregated[name]) {
            aggregated[name] = { name, maxWeight: 0, totalSets: 0, totalReps: 0 }
          }

          ex.sets.forEach((set: any) => {
            if (set.completed) {
              aggregated[name].totalSets += 1
              aggregated[name].totalReps += set.reps
              if (set.weight_lbs > aggregated[name].maxWeight) {
                aggregated[name].maxWeight = set.weight_lbs
              }
            }
          })
        })
      })

      // Convert to array and sort by name
      const statsArray = Object.values(aggregated).sort((a, b) => a.name.localeCompare(b.name))
      // Filter out exercises that have 0 completed sets
      const filteredStats = statsArray.filter(s => s.totalSets > 0)

      setStats(filteredStats)
      setIsLoading(false)
    }

    fetchDatabase()
  }, [router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center text-cyan-500">
          <RefreshCw className="animate-spin w-8 h-8" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 flex font-sans selection:bg-cyan-500/30">
      <Sidebar />

      <div className="flex-1 p-6 md:p-12 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          <div className="mb-12 flex items-center gap-4">
            <div className="p-3 bg-neutral-900 rounded-xl border border-neutral-800">
              <DatabaseIcon className="w-8 h-8 text-blue-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Personal Records</h1>
              <p className="text-neutral-400 mt-1">A dynamic library of every exercise you've performed.</p>
            </div>
          </div>

          {stats.length === 0 ? (
            <div className="text-center p-12 border border-dashed border-neutral-800 rounded-2xl bg-neutral-900/20">
              <p className="text-neutral-500">No exercises logged yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stats.map((stat) => (
                <div key={stat.name} className="p-5 rounded-2xl bg-neutral-900/40 border border-neutral-800 hover:border-blue-500/50 transition-colors group">
                  <h3 className="font-bold text-lg text-neutral-200 group-hover:text-blue-400 transition-colors mb-4 line-clamp-1">
                    {stat.name}
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-black/50 p-3 rounded-xl border border-neutral-800/50">
                      <div className="flex items-center gap-1.5 text-xs text-neutral-500 font-semibold uppercase tracking-wider mb-1">
                        <Trophy className="w-3.5 h-3.5 text-yellow-500" />
                        Max PR
                      </div>
                      <div className="text-xl font-bold text-neutral-200">
                        {stat.maxWeight} <span className="text-xs text-neutral-500 font-normal">lbs</span>
                      </div>
                    </div>

                    <div className="bg-black/50 p-3 rounded-xl border border-neutral-800/50">
                      <div className="flex items-center gap-1.5 text-xs text-neutral-500 font-semibold uppercase tracking-wider mb-1">
                        <Target className="w-3.5 h-3.5 text-emerald-500" />
                        Volume
                      </div>
                      <div className="text-xl font-bold text-neutral-200">
                        {stat.totalSets} <span className="text-xs text-neutral-500 font-normal">sets</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
