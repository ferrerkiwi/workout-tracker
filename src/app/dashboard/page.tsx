'use client'

import { useState, useEffect } from 'react'
import { Dumbbell, Activity, Calendar, Plus, RefreshCw, ChevronRight, BarChart3, Database } from 'lucide-react'
import { WorkoutRoutine } from '@/lib/ai-fallback'
import DataExport from '@/components/DataExport'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const router = useRouter()
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedRoutine, setGeneratedRoutine] = useState<WorkoutRoutine | null>(null)
  
  const [profile, setProfile] = useState<any>(null)
  const [stats, setStats] = useState({ volume: 0, sessions: 0 })
  const [recentWorkouts, setRecentWorkouts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Fetch profile constraints
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      setProfile(profileData)

      // Fetch history
      const { data: workoutsData } = await supabase
        .from('workouts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3)
      
      setRecentWorkouts(workoutsData || [])
      
      // Calculate Volume
      let totalVolume = 0
      if (workoutsData && workoutsData.length > 0) {
        const workoutIds = workoutsData.map(w => w.id)
        
        const { data: exercisesData } = await supabase
          .from('workout_exercises')
          .select('id')
          .in('workout_id', workoutIds)
          
        if (exercisesData && exercisesData.length > 0) {
          const exerciseIds = exercisesData.map(e => e.id)
          
          const { data: setsData } = await supabase
            .from('sets')
            .select('reps, weight_lbs')
            .in('workout_exercise_id', exerciseIds)
            .eq('completed', true)
            
          if (setsData) {
            totalVolume = setsData.reduce((acc, set) => acc + (set.reps * set.weight_lbs), 0)
          }
        }
      }

      setStats({ volume: totalVolume, sessions: workoutsData?.length || 0 })
      
      setIsLoading(false)
    }
    fetchData()
  }, [router])

  const handleGenerate = async () => {
    setIsGenerating(true)
    setGeneratedRoutine(null)
    
    try {
      const res = await fetch('/api/generate-routine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goals: profile?.goals || 'hypertrophy',
          equipment_limitations: profile?.equipment_limitations || [],
          comfort_levels: profile?.comfort_levels || [],
          target_muscle_groups: ['Chest', 'Triceps']
        })
      })
      
      const data = await res.json()
      setGeneratedRoutine(data)
    } catch (error) {
      console.error(error)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleStartSession = async () => {
    if (!generatedRoutine) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    try {
      // 1. Create Workout
      const { data: workout, error: workoutErr } = await supabase.from('workouts').insert({
        user_id: user.id,
        name: generatedRoutine.name,
        muscle_groups_targeted: generatedRoutine.muscle_groups_targeted,
        notes: generatedRoutine.notes
      }).select().single()

      if (workoutErr || !workout) throw workoutErr

      // 2. Create Exercises
      const exercisesToInsert = generatedRoutine.exercises.map((ex) => ({
        workout_id: workout.id,
        exercise_name: ex.name,
        order_index: ex.order_index,
        type: ex.type,
        notes: ex.notes
      }))

      const { data: exercises, error: exErr } = await supabase.from('workout_exercises')
        .insert(exercisesToInsert).select()
      
      if (exErr) throw exErr

      // 3. Create Sets
      if (exercises && exercises.length > 0) {
        const setsToInsert: any[] = []
        generatedRoutine.exercises.forEach((exGen) => {
          const savedEx = exercises.find(e => e.order_index === exGen.order_index)
          if (savedEx) {
            const repCount = parseInt(exGen.recommended_reps) || 10
            for (let s = 1; s <= exGen.recommended_sets; s++) {
              setsToInsert.push({
                workout_exercise_id: savedEx.id,
                set_number: s,
                reps: repCount,
                weight_lbs: 0
              })
            }
          }
        })
        await supabase.from('sets').insert(setsToInsert)
      }

      router.push(`/workout/${workout.id}`)
    } catch (error) {
      console.error("Error creating session", error)
      alert("Failed to start session. Check console.")
    }
  }

  if (isLoading) {
    return <div className="min-h-screen bg-black flex items-center justify-center text-cyan-500"><RefreshCw className="animate-spin w-8 h-8" /></div>
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 flex font-sans selection:bg-cyan-500/30">
      
      {/* Sidebar Navigation */}
      <div className="hidden md:flex flex-col w-20 border-r border-neutral-800 bg-neutral-900/20 py-8 items-center gap-8">
        <div className="p-3 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.4)]">
          <Dumbbell className="w-6 h-6 text-white" />
        </div>
        <div className="flex flex-col gap-6">
          <button className="p-3 rounded-xl bg-neutral-800/50 text-cyan-400 group relative">
            <Activity className="w-6 h-6" />
          </button>
          <button className="p-3 rounded-xl text-neutral-500 cursor-not-allowed group relative">
            <Calendar className="w-6 h-6" />
            <span className="absolute left-14 bg-neutral-800 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Coming soon</span>
          </button>
          <button className="p-3 rounded-xl text-neutral-500 cursor-not-allowed group relative">
            <Database className="w-6 h-6" />
            <span className="absolute left-14 bg-neutral-800 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Coming soon</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        
        {/* Left Pane: Historical Progression & Analytics */}
        <div className="flex-1 border-r border-neutral-800 p-6 md:p-8 overflow-y-auto">
          <div className="mb-8 flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Hypertrophy Analytics</h1>
              <p className="text-neutral-400 text-sm mt-1">Weekly volume load and progressive overload metrics.</p>
            </div>
            <DataExport />
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="p-5 rounded-2xl bg-neutral-900/50 border border-neutral-800">
              <div className="flex items-center gap-2 text-cyan-400 mb-2">
                <BarChart3 className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">Weekly Volume</span>
              </div>
              <div className="text-3xl font-bold">{stats.volume.toLocaleString()} <span className="text-sm font-normal text-neutral-500">lbs</span></div>
            </div>
            
            <div className="p-5 rounded-2xl bg-neutral-900/50 border border-neutral-800">
              <div className="flex items-center gap-2 text-blue-400 mb-2">
                <Activity className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">Sessions</span>
              </div>
              <div className="text-3xl font-bold">{stats.sessions}</div>
            </div>
          </div>

          {/* Recent Workouts */}
          <div>
            <h3 className="text-lg font-semibold mb-4 border-b border-neutral-800 pb-2">Recent Sessions</h3>
            <div className="space-y-3">
              {recentWorkouts.length === 0 ? (
                <div className="text-neutral-500 text-sm p-4 border border-dashed border-neutral-800 rounded-xl text-center">
                  No sessions logged yet. Generate an AI routine to get started!
                </div>
              ) : (
                recentWorkouts.map((w) => (
                  <div key={w.id} className="flex items-center justify-between p-4 rounded-xl hover:bg-neutral-900/40 border border-transparent hover:border-neutral-800 transition-colors cursor-pointer group">
                    <div>
                      <div className="font-medium text-neutral-200 group-hover:text-cyan-400 transition-colors">{w.name}</div>
                      <div className="text-xs text-neutral-500 mt-1">{new Date(w.created_at).toLocaleDateString()}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Pane: AI Generator */}
        <div className="flex-1 md:max-w-xl p-6 md:p-8 bg-black overflow-y-auto relative">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-900/10 blur-[100px] rounded-full pointer-events-none" />

          <div className="relative z-10 flex flex-col h-full">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">AI Routine Generator</h2>
                <p className="text-neutral-400 text-sm mt-1">Constraint-aware workout routing.</p>
              </div>
              <button 
                onClick={handleGenerate}
                disabled={isGenerating}
                className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl hover:bg-neutral-800 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className={`w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform ${isGenerating ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="flex-1 flex flex-col justify-center">
              {!isGenerating && !generatedRoutine && (
                <div className="text-center p-8 border border-neutral-800/50 rounded-2xl bg-neutral-900/20 backdrop-blur-sm">
                  <div className="w-16 h-16 bg-gradient-to-br from-neutral-800 to-neutral-900 rounded-full flex items-center justify-center mx-auto mb-4 border border-neutral-800">
                    <RefreshCw className="w-6 h-6 text-neutral-500" />
                  </div>
                  <h3 className="text-lg font-medium text-neutral-300">Ready to build</h3>
                  <p className="text-sm text-neutral-500 mt-2 max-w-xs mx-auto">Click the generate button to create a routine tailored to your specific constraints and recovery state.</p>
                </div>
              )}

              {isGenerating && (
                <div className="space-y-6 animate-pulse">
                  <div className="h-8 bg-neutral-800/50 rounded-lg w-3/4"></div>
                  <div className="flex gap-2 mb-6">
                    <div className="h-6 bg-neutral-800/50 rounded-full w-20"></div>
                    <div className="h-6 bg-neutral-800/50 rounded-full w-24"></div>
                  </div>
                  <div className="space-y-4">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="p-4 border border-neutral-800/50 rounded-xl bg-neutral-900/30">
                        <div className="h-5 bg-neutral-800/50 rounded w-1/2 mb-3"></div>
                        <div className="flex gap-4">
                          <div className="h-4 bg-neutral-800/50 rounded w-16"></div>
                          <div className="h-4 bg-neutral-800/50 rounded w-20"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!isGenerating && generatedRoutine && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-2">
                    {generatedRoutine.name}
                  </h3>
                  <div className="flex flex-wrap gap-2 mb-6">
                    {generatedRoutine.muscle_groups_targeted.map(m => (
                      <span key={m} className="px-3 py-1 bg-cyan-950/30 text-cyan-400 border border-cyan-500/20 rounded-full text-xs font-medium">
                        {m}
                      </span>
                    ))}
                  </div>

                  {generatedRoutine.notes && (
                    <div className="mb-6 p-3 bg-blue-950/20 border-l-2 border-blue-500 text-sm text-neutral-300">
                      {generatedRoutine.notes}
                    </div>
                  )}

                  <div className="space-y-3">
                    {generatedRoutine.exercises.map((ex, i) => (
                      <div key={i} className="group p-4 border border-neutral-800 bg-neutral-900/40 rounded-xl hover:border-neutral-700 transition-colors">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-neutral-200 flex items-center gap-2">
                            <span className="text-xs text-neutral-500 font-mono">{i+1}.</span>
                            {ex.name}
                          </h4>
                          <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded border ${
                            ex.type === 'warmup' ? 'bg-orange-950/30 text-orange-400 border-orange-500/20' :
                            ex.type === 'cooldown' ? 'bg-purple-950/30 text-purple-400 border-purple-500/20' :
                            'bg-blue-950/30 text-blue-400 border-blue-500/20'
                          }`}>
                            {ex.type}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-neutral-400 font-medium">{ex.recommended_sets} sets</span>
                          <span className="w-1 h-1 bg-neutral-700 rounded-full"></span>
                          <span className="text-neutral-400 font-medium">{ex.recommended_reps}</span>
                        </div>
                        {ex.notes && <p className="text-xs text-neutral-500 mt-3">{ex.notes}</p>}
                      </div>
                    ))}
                  </div>

                  <button 
                    onClick={handleStartSession}
                    className="w-full mt-6 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold rounded-xl px-4 py-3 text-sm transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.2)]"
                  >
                    Start Session <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>

      </div>
    </div>
  )
}
