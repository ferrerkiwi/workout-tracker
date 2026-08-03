'use client'

import { useState, useEffect } from 'react'
import { Target, Check, ShieldCheck, RefreshCw, Save, CheckCircle2 } from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type ProfileData = {
  goals: string
  equipment_limitations: string[]
  comfort_levels: string[]
}

const goalsList = [
  { id: 'hypertrophy', label: 'Hypertrophy Focus', desc: 'Maximize muscle size and volume' },
  { id: 'strength', label: 'Raw Strength', desc: 'Increase 1RM and overall power' },
  { id: 'endurance', label: 'Muscle Endurance', desc: 'Higher rep ranges, shorter rests' }
]

const equipmentList = [
  { id: 'barbell', label: 'Barbells' },
  { id: 'dumbbell', label: 'Dumbbells' },
  { id: 'cable', label: 'Cable Machines' },
  { id: 'leg_press', label: 'Leg Press' },
  { id: 'leg_curl', label: 'Seated Leg Curl' },
  { id: 'leg_extension', label: 'Leg Extension' },
  { id: 'smith_machine', label: 'Smith Machine' }
]

const comfortList = [
  { id: 'no_complex', label: 'Avoid Complex/Flashy Exercises', desc: 'Stick to the basics and proven movements' },
  { id: 'no_heavy_axial', label: 'Avoid Heavy Axial Loading', desc: 'Minimize heavy barbell squats and deadlifts' },
  { id: 'machine_only', label: 'Machine-Heavy Focus', desc: 'Prefer machines for stability and safety' }
]

export default function SettingsPage() {
  const router = useRouter()
  const [data, setData] = useState<ProfileData>({
    goals: '',
    equipment_limitations: [],
    comfort_levels: []
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profile) {
        setData({
          goals: profile.goals || '',
          equipment_limitations: profile.equipment_limitations || [],
          comfort_levels: profile.comfort_levels || []
        })
      }
      setIsLoading(false)
    }

    fetchProfile()
  }, [router])

  const toggleArrayItem = (field: 'equipment_limitations' | 'comfort_levels', id: string) => {
    setData((prev) => {
      const array = prev[field]
      if (array.includes(id)) {
        return { ...prev, [field]: array.filter((i) => i !== id) }
      } else {
        return { ...prev, [field]: [...array, id] }
      }
    })
  }

  const handleSave = async () => {
    setIsSaving(true)
    setShowSuccess(false)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('profiles')
        .update({
          goals: data.goals,
          equipment_limitations: data.equipment_limitations,
          comfort_levels: data.comfort_levels
        })
        .eq('id', user.id)

      if (error) throw error
      
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
    } catch (err) {
      console.error(err)
      alert("Failed to save settings.")
    } finally {
      setIsSaving(false)
    }
  }

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
        <div className="max-w-3xl mx-auto pb-20">
          <div className="mb-12 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Personal Information</h1>
              <p className="text-neutral-400 mt-1">Update your AI generation constraints and preferences.</p>
            </div>
            
            <button
              onClick={handleSave}
              disabled={isSaving || !data.goals}
              className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white px-5 py-2.5 rounded-xl font-semibold transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Save Changes
            </button>
          </div>

          {showSuccess && (
            <div className="mb-8 p-4 bg-emerald-950/30 border border-emerald-500/30 rounded-xl flex items-center gap-3 text-emerald-400 animate-in fade-in slide-in-from-top-2">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-medium text-sm">Settings saved successfully! Future AI generations will use these constraints.</span>
            </div>
          )}

          <div className="space-y-12">
            
            {/* Goals Section */}
            <section className="bg-neutral-900/20 border border-neutral-800 rounded-2xl p-6 md:p-8">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Target className="w-5 h-5 text-cyan-400" />
                Primary Goal
              </h2>
              <div className="grid gap-4">
                {goalsList.map((goal) => (
                  <button
                    key={goal.id}
                    onClick={() => setData({ ...data, goals: goal.id })}
                    className={`flex items-start p-4 rounded-xl border transition-all text-left ${
                      data.goals === goal.id 
                        ? 'bg-cyan-950/40 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.15)]' 
                        : 'bg-neutral-900/50 border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    <div className={`mt-0.5 flex-shrink-0 mr-4 ${data.goals === goal.id ? 'text-cyan-400' : 'text-neutral-500'}`}>
                      <Target className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-neutral-100">{goal.label}</h3>
                      <p className="text-xs text-neutral-400 mt-1">{goal.desc}</p>
                    </div>
                    {data.goals === goal.id && (
                      <div className="ml-auto flex-shrink-0 text-cyan-400 mt-1">
                        <Check className="w-4 h-4" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </section>

            {/* Equipment Section */}
            <section className="bg-neutral-900/20 border border-neutral-800 rounded-2xl p-6 md:p-8">
              <h2 className="text-xl font-bold mb-2">Available Equipment</h2>
              <p className="text-neutral-400 text-sm mb-6">Select the equipment you have consistent access to.</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {equipmentList.map((eq) => {
                  const isSelected = data.equipment_limitations.includes(eq.id)
                  return (
                    <button
                      key={eq.id}
                      onClick={() => toggleArrayItem('equipment_limitations', eq.id)}
                      className={`flex items-center justify-between p-4 rounded-xl border transition-all text-left ${
                        isSelected 
                          ? 'bg-blue-950/40 border-blue-500/50 text-blue-50' 
                          : 'bg-neutral-900/50 border-neutral-800 hover:border-neutral-700 text-neutral-400'
                      }`}
                    >
                      <span className="font-medium text-sm">{eq.label}</span>
                      {isSelected && <Check className="w-4 h-4 text-blue-400" />}
                    </button>
                  )
                })}
              </div>
            </section>

            {/* Comfort Section */}
            <section className="bg-neutral-900/20 border border-neutral-800 rounded-2xl p-6 md:p-8">
              <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-purple-400" />
                Comfort Limits
              </h2>
              <p className="text-neutral-400 text-sm mb-6">Flag any personal preferences or restrictions.</p>
              
              <div className="grid gap-4">
                {comfortList.map((comfort) => {
                  const isSelected = data.comfort_levels.includes(comfort.id)
                  return (
                    <button
                      key={comfort.id}
                      onClick={() => toggleArrayItem('comfort_levels', comfort.id)}
                      className={`flex items-start p-4 rounded-xl border transition-all text-left ${
                        isSelected 
                          ? 'bg-purple-950/40 border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.15)]' 
                          : 'bg-neutral-900/50 border-neutral-800 hover:border-neutral-700'
                      }`}
                    >
                      <div className={`mt-0.5 flex-shrink-0 mr-4 ${isSelected ? 'text-purple-400' : 'text-neutral-500'}`}>
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-neutral-100">{comfort.label}</h3>
                        <p className="text-xs text-neutral-400 mt-1">{comfort.desc}</p>
                      </div>
                      {isSelected && (
                        <div className="ml-auto flex-shrink-0 text-purple-400 mt-1">
                          <Check className="w-4 h-4" />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </section>

          </div>
        </div>
      </div>
    </div>
  )
}
