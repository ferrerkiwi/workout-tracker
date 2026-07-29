'use client'

import { useState } from 'react'
import { Dumbbell, ArrowRight, Activity, Zap } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLogin, setIsLogin] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorMsg('')
    
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        window.location.href = '/dashboard'
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        window.location.href = '/onboarding'
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during authentication')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 flex flex-col md:flex-row font-sans selection:bg-cyan-500/30">
      {/* Left side - Visuals */}
      <div className="relative hidden md:flex flex-1 flex-col justify-between p-12 overflow-hidden bg-black">
        {/* Abstract background elements */}
        <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] rounded-full bg-cyan-900/20 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] rounded-full bg-blue-900/20 blur-[120px] pointer-events-none" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 text-cyan-400 mb-12">
            <div className="p-2 bg-cyan-500/10 rounded-xl border border-cyan-500/20">
              <Dumbbell className="w-8 h-8" />
            </div>
            <span className="text-2xl font-bold tracking-tight">AI-Tracker</span>
          </div>
          
          <h1 className="text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] mb-6">
            Hypertrophy, <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">
              Engineered.
            </span>
          </h1>
          <p className="text-neutral-400 text-lg max-w-md leading-relaxed">
            Data-driven workouts tailored to your specific constraints, goals, and equipment. Powered by advanced AI routing.
          </p>
        </div>

        <div className="relative z-10 grid gap-6">
          <div className="flex items-center gap-4 bg-neutral-900/50 p-4 rounded-2xl border border-neutral-800/50 backdrop-blur-md">
            <Activity className="w-6 h-6 text-cyan-400" />
            <div className="flex flex-col">
              <span className="font-semibold text-sm">Volume Tracking</span>
              <span className="text-xs text-neutral-500">Monitor progressive overload</span>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-neutral-900/50 p-4 rounded-2xl border border-neutral-800/50 backdrop-blur-md">
            <Zap className="w-6 h-6 text-blue-400" />
            <div className="flex flex-col">
              <span className="font-semibold text-sm">Constraint-Aware</span>
              <span className="text-xs text-neutral-500">Works with your exact equipment</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 md:p-12 relative">
        <div className="w-full max-w-md space-y-8 relative z-10">
          
          {/* Mobile Header */}
          <div className="md:hidden flex items-center gap-3 text-cyan-400 mb-12">
            <div className="p-2 bg-cyan-500/10 rounded-xl border border-cyan-500/20">
              <Dumbbell className="w-6 h-6" />
            </div>
            <span className="text-xl font-bold tracking-tight">AI-Tracker</span>
          </div>

          <div className="text-center md:text-left">
            <h2 className="text-3xl font-bold tracking-tight mb-2">
              {isLogin ? 'Welcome back' : 'Create an account'}
            </h2>
            <p className="text-neutral-400 text-sm">
              {isLogin ? 'Enter your details to access your dashboard.' : 'Start your personalized hypertrophy journey today.'}
            </p>
            {errorMsg && (
              <div className="mt-4 p-3 bg-red-950/30 border border-red-500/50 rounded-xl text-red-400 text-sm">
                {errorMsg}
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1">
              <label className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-neutral-900/50 border border-neutral-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all placeholder:text-neutral-600"
                placeholder="you@example.com"
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-neutral-900/50 border border-neutral-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all placeholder:text-neutral-600"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold rounded-xl px-4 py-3 text-sm transition-all flex items-center justify-center gap-2 group shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Processing...' : (isLogin ? 'Sign In' : 'Get Started')}
              {!isLoading && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
            </button>
          </form>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-neutral-400 hover:text-white transition-colors"
            >
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <span className="text-cyan-400 font-medium">{isLogin ? 'Sign up' : 'Log in'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
