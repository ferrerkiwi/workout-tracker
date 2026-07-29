'use client'

import { useState, useEffect } from 'react'
import { Calendar as CalendarIcon, RefreshCw, ChevronRight } from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function CalendarPage() {
  const router = useRouter()
  const [workouts, setWorkouts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchHistory = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data } = await supabase
        .from('workouts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      
      setWorkouts(data || [])
      setIsLoading(false)
    }

    fetchHistory()
  }, [router])

  // Group workouts by month and year
  const groupedWorkouts = workouts.reduce((acc: any, workout) => {
    const date = new Date(workout.created_at)
    const monthYear = date.toLocaleString('default', { month: 'long', year: 'numeric' })
    if (!acc[monthYear]) acc[monthYear] = []
    acc[monthYear].push(workout)
    return acc
  }, {})

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
              <CalendarIcon className="w-8 h-8 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Training History</h1>
              <p className="text-neutral-400 mt-1">A chronological timeline of your completed sessions.</p>
            </div>
          </div>

          {Object.keys(groupedWorkouts).length === 0 ? (
            <div className="text-center p-12 border border-dashed border-neutral-800 rounded-2xl bg-neutral-900/20">
              <p className="text-neutral-500">No training history found.</p>
            </div>
          ) : (
            <div className="space-y-12">
              {Object.entries(groupedWorkouts).map(([month, monthWorkouts]: [string, any]) => (
                <div key={month}>
                  <h2 className="text-xl font-bold text-neutral-300 mb-6 flex items-center gap-4">
                    {month}
                    <div className="flex-1 h-px bg-gradient-to-r from-neutral-800 to-transparent"></div>
                  </h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {monthWorkouts.map((workout: any) => {
                      const date = new Date(workout.created_at)
                      const dayName = date.toLocaleDateString('default', { weekday: 'short' })
                      const dayNumber = date.getDate()

                      return (
                        <Link 
                          key={workout.id}
                          href={`/workout/${workout.id}`}
                          className="flex items-center gap-4 p-4 rounded-2xl bg-neutral-900/40 border border-neutral-800 hover:border-cyan-500/50 hover:bg-neutral-900/60 transition-all group"
                        >
                          <div className="flex flex-col items-center justify-center w-14 h-14 bg-black rounded-xl border border-neutral-800 group-hover:border-cyan-500/30 transition-colors">
                            <span className="text-xs text-neutral-500 font-medium uppercase tracking-wider">{dayName}</span>
                            <span className="text-xl font-bold text-neutral-200">{dayNumber}</span>
                          </div>
                          
                          <div className="flex-1">
                            <h3 className="font-bold text-lg text-neutral-200 group-hover:text-cyan-400 transition-colors">
                              {workout.name}
                            </h3>
                            <div className="flex gap-2 mt-1">
                              {workout.muscle_groups_targeted?.slice(0, 3).map((m: string) => (
                                <span key={m} className="text-[10px] text-neutral-400 bg-neutral-800/50 px-2 py-0.5 rounded-full">
                                  {m}
                                </span>
                              ))}
                            </div>
                          </div>

                          <ChevronRight className="w-5 h-5 text-neutral-600 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
                        </Link>
                      )
                    })}
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
