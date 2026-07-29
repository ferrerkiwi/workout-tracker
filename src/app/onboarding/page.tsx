'use client'

import { useState } from 'react'
import { ArrowRight, ArrowLeft, Target, Dumbbell, ShieldCheck, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type OnboardingData = {
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

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [data, setData] = useState<OnboardingData>({
    goals: '',
    equipment_limitations: [],
    comfort_levels: []
  })

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

  const handleNext = () => setStep((s) => Math.min(s + 1, 4))
  const handleBack = () => setStep((s) => Math.max(s - 1, 1))

  const handleSubmit = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("No authenticated user found")

      const { error } = await supabase
        .from('profiles')
        .update({
          goals: data.goals,
          equipment_limitations: data.equipment_limitations,
          comfort_levels: data.comfort_levels
        })
        .eq('id', user.id)

      if (error) throw error
      
      window.location.href = '/dashboard'
    } catch (err) {
      console.error('Error saving onboarding data:', err)
      alert('Failed to save profile. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 font-sans selection:bg-cyan-500/30 py-12 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto">
        
        {/* Progress Bar */}
        <div className="mb-12">
          <div className="flex justify-between mb-2">
            <span className="text-xs font-semibold text-cyan-400 tracking-wider uppercase">Step {step} of 3</span>
            <span className="text-xs text-neutral-500 tracking-wider uppercase">Constraint Capture</span>
          </div>
          <div className="h-2 bg-neutral-900 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 transition-all duration-500 ease-out"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* Step 1: Goals */}
        {step === 1 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
              <h1 className="text-3xl font-bold tracking-tight mb-3">Define your baseline goals</h1>
              <p className="text-neutral-400 text-sm">Select the primary driver for your AI routine generation.</p>
            </div>

            <div className="grid gap-4">
              {goalsList.map((goal) => (
                <button
                  key={goal.id}
                  onClick={() => setData({ ...data, goals: goal.id })}
                  className={`flex items-start p-5 rounded-2xl border transition-all text-left ${
                    data.goals === goal.id 
                      ? 'bg-cyan-950/40 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.15)]' 
                      : 'bg-neutral-900/50 border-neutral-800 hover:border-neutral-700'
                  }`}
                >
                  <div className={`mt-1 flex-shrink-0 mr-4 ${data.goals === goal.id ? 'text-cyan-400' : 'text-neutral-500'}`}>
                    <Target className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-neutral-100">{goal.label}</h3>
                    <p className="text-xs text-neutral-400 mt-1">{goal.desc}</p>
                  </div>
                  {data.goals === goal.id && (
                    <div className="ml-auto flex-shrink-0 text-cyan-400 mt-1">
                      <Check className="w-5 h-5" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Equipment */}
        {step === 2 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
              <h1 className="text-3xl font-bold tracking-tight mb-3">Available Equipment</h1>
              <p className="text-neutral-400 text-sm">Select the equipment you have consistent access to. The AI will strictly adhere to these limits.</p>
            </div>

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
                        : 'bg-neutral-900/50 border-neutral-800 hover:border-neutral-700 text-neutral-300'
                    }`}
                  >
                    <span className="font-medium text-sm">{eq.label}</span>
                    {isSelected && <Check className="w-4 h-4 text-blue-400" />}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Step 3: Comfort Levels */}
        {step === 3 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
              <h1 className="text-3xl font-bold tracking-tight mb-3">Environmental & Comfort Limits</h1>
              <p className="text-neutral-400 text-sm">Flag any personal preferences to ensure the generated routines align with your comfort zone.</p>
            </div>

            <div className="grid gap-4">
              {comfortList.map((comfort) => {
                const isSelected = data.comfort_levels.includes(comfort.id)
                return (
                  <button
                    key={comfort.id}
                    onClick={() => toggleArrayItem('comfort_levels', comfort.id)}
                    className={`flex items-start p-5 rounded-2xl border transition-all text-left ${
                      isSelected 
                        ? 'bg-cyan-950/40 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.15)]' 
                        : 'bg-neutral-900/50 border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    <div className={`mt-1 flex-shrink-0 mr-4 ${isSelected ? 'text-cyan-400' : 'text-neutral-500'}`}>
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-neutral-100">{comfort.label}</h3>
                      <p className="text-xs text-neutral-400 mt-1">{comfort.desc}</p>
                    </div>
                    {isSelected && (
                      <div className="ml-auto flex-shrink-0 text-cyan-400 mt-1">
                        <Check className="w-5 h-5" />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="mt-12 flex items-center justify-between pt-6 border-t border-neutral-800">
          <button
            onClick={handleBack}
            disabled={step === 1}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
              step === 1 ? 'text-neutral-700 cursor-not-allowed' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          {step < 3 ? (
            <button
              onClick={handleNext}
              disabled={step === 1 && !data.goals}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                (step === 1 && !data.goals)
                  ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                  : 'bg-white text-black hover:bg-neutral-200'
              }`}
            >
              Continue <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)]"
            >
              Generate AI Profile <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>

      </div>
    </div>
  )
}
