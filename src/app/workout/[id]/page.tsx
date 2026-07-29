'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, Circle, Clock, ChevronLeft, Save, RefreshCw, Plus } from 'lucide-react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function WorkoutSessionPage() {
  const { id: workoutId } = useParams()
  const router = useRouter()
  
  const [workout, setWorkout] = useState<any>(null)
  const [exercises, setExercises] = useState<any[]>([])
  const [sets, setSets] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTimer, setActiveTimer] = useState<number | null>(null)

  useEffect(() => {
    if (!workoutId) return

    const fetchSession = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')

      // Fetch Workout
      const { data: wData } = await supabase.from('workouts').select('*').eq('id', workoutId).single()
      if (!wData) return router.push('/dashboard')
      setWorkout(wData)

      // Fetch Exercises
      const { data: exData } = await supabase.from('workout_exercises').select('*').eq('workout_id', workoutId).order('order_index', { ascending: true })
      setExercises(exData || [])

      // Fetch Sets
      if (exData && exData.length > 0) {
        const exIds = exData.map(e => e.id)
        const { data: sData } = await supabase.from('sets').select('*').in('workout_exercise_id', exIds).order('set_number', { ascending: true })
        setSets(sData || [])
      }

      setIsLoading(false)
    }

    fetchSession()
  }, [workoutId, router])

  // Rest Timer Logic
  useEffect(() => {
    if (activeTimer === null) return
    if (activeTimer <= 0) {
      setActiveTimer(null)
      return
    }
    const interval = setInterval(() => {
      setActiveTimer(prev => (prev !== null ? prev - 1 : null))
    }, 1000)
    return () => clearInterval(interval)
  }, [activeTimer])

  const toggleSet = async (setId: string, currentCompleted: boolean) => {
    const newCompleted = !currentCompleted
    
    // Optimistic UI update
    setSets(prev => prev.map(s => s.id === setId ? { ...s, completed: newCompleted } : s))
    
    if (newCompleted) {
      setActiveTimer(90) // Auto-start 90s rest
    }

    // DB Update
    await supabase.from('sets').update({ completed: newCompleted }).eq('id', setId)
  }

  const updateSet = async (setId: string, field: 'reps' | 'weight_lbs', value: string) => {
    const numValue = parseInt(value) || 0
    // Optimistic UI
    setSets(prev => prev.map(s => s.id === setId ? { ...s, [field]: numValue } : s))
    // DB Update (debouncing would be better here, but firing direct for now)
    await supabase.from('sets').update({ [field]: numValue }).eq('id', setId)
  }

  const handleFinish = () => {
    // Force a full reload to bypass router cache and fetch fresh dashboard data
    window.location.href = '/dashboard'
  }

  if (isLoading) {
    return <div className="min-h-screen bg-black flex items-center justify-center text-cyan-500"><RefreshCw className="animate-spin w-8 h-8" /></div>
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 font-sans selection:bg-cyan-500/30">
      
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-neutral-950/80 backdrop-blur-md border-b border-neutral-800 px-4 py-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="p-2 -ml-2 rounded-lg hover:bg-neutral-800 transition-colors text-neutral-400">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-lg font-bold">{workout?.name || 'Workout Session'}</h1>
            <p className="text-xs text-neutral-500">Session in progress</p>
          </div>
        </div>
        <button 
          onClick={handleFinish}
          className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)]"
        >
          <Save className="w-4 h-4" />
          <span className="hidden sm:inline">Finish Workout</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto p-4 sm:p-6 space-y-8 pb-32">
        
        {/* Rest Timer Banner */}
        {activeTimer !== null && (
          <div className="sticky top-20 z-40 bg-blue-950/90 backdrop-blur-md border border-blue-500/50 rounded-xl p-4 flex justify-between items-center shadow-lg shadow-blue-900/20">
            <div className="flex items-center gap-3 text-blue-400">
              <Clock className="w-5 h-5 animate-pulse" />
              <span className="font-semibold text-sm tracking-wide">REST TIMER</span>
            </div>
            <div className="text-2xl font-mono font-bold text-blue-50">
              {Math.floor(activeTimer / 60)}:{(activeTimer % 60).toString().padStart(2, '0')}
            </div>
          </div>
        )}

        {/* Exercises */}
        {exercises.map((ex) => {
          const exSets = sets.filter(s => s.workout_exercise_id === ex.id)
          
          return (
            <div key={ex.id} className="bg-neutral-900/40 border border-neutral-800 rounded-2xl overflow-hidden">
              <div className="p-4 sm:p-6 border-b border-neutral-800 bg-neutral-900/60">
                <div className="flex justify-between items-start mb-2">
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight">{ex.exercise_name}</h2>
                  <span className={`text-[10px] sm:text-xs uppercase tracking-wider font-bold px-2 py-1 rounded border ${
                    ex.type === 'warmup' ? 'bg-orange-950/30 text-orange-400 border-orange-500/20' :
                    ex.type === 'cooldown' ? 'bg-purple-950/30 text-purple-400 border-purple-500/20' :
                    'bg-cyan-950/30 text-cyan-400 border-cyan-500/20'
                  }`}>
                    {ex.type}
                  </span>
                </div>
                {ex.notes && <p className="text-sm text-neutral-400">{ex.notes}</p>}
              </div>

              <div className="p-4 sm:p-6">
                <div className="grid grid-cols-12 gap-2 sm:gap-4 mb-3 px-2 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  <div className="col-span-2 text-center">Set</div>
                  <div className="col-span-4 text-center">lbs</div>
                  <div className="col-span-4 text-center">Reps</div>
                  <div className="col-span-2 text-center"><CheckCircle2 className="w-4 h-4 mx-auto" /></div>
                </div>

                <div className="space-y-3">
                  {exSets.map((set, idx) => (
                    <div 
                      key={set.id} 
                      className={`grid grid-cols-12 gap-2 sm:gap-4 items-center p-2 rounded-xl transition-colors ${
                        set.completed ? 'bg-cyan-950/20' : 'bg-neutral-800/30'
                      }`}
                    >
                      <div className="col-span-2 text-center font-mono text-sm font-semibold text-neutral-400">
                        {idx + 1}
                      </div>
                      
                      <div className="col-span-4">
                        <input 
                          type="number"
                          placeholder="-"
                          value={set.weight_lbs || ''}
                          onChange={(e) => updateSet(set.id, 'weight_lbs', e.target.value)}
                          disabled={set.completed}
                          className="w-full bg-neutral-950 border border-neutral-700 rounded-lg py-2 text-center text-lg font-semibold focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors disabled:opacity-50"
                        />
                      </div>

                      <div className="col-span-4">
                        <input 
                          type="number"
                          placeholder="-"
                          value={set.reps || ''}
                          onChange={(e) => updateSet(set.id, 'reps', e.target.value)}
                          disabled={set.completed}
                          className="w-full bg-neutral-950 border border-neutral-700 rounded-lg py-2 text-center text-lg font-semibold focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors disabled:opacity-50"
                        />
                      </div>

                      <div className="col-span-2 flex justify-center">
                        <button 
                          onClick={() => toggleSet(set.id, set.completed)}
                          className="p-2 rounded-lg hover:bg-neutral-700/50 transition-colors"
                        >
                          {set.completed ? (
                            <CheckCircle2 className="w-7 h-7 text-cyan-400" />
                          ) : (
                            <Circle className="w-7 h-7 text-neutral-500" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </main>
    </div>
  )
}
