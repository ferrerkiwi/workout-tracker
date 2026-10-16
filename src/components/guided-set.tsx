'use client'

import { Mic, MicOff, Pause, Play, Volume2, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  READY_DURATION_MS,
  getCompletedReps,
  getReadyCountdown,
  getTempoSnapshot,
  isVoiceStopCommand,
  type GuidedSetPhase,
} from '@/lib/guided-set'

type GuidedSetStatus =
  | 'idle'
  | 'ready'
  | 'running'
  | 'paused'

type SpeechRecognitionResultLike = ArrayLike<{ transcript: string }> & {
  isFinal: boolean
}

type SpeechRecognitionLike = {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  onresult: ((event: { results: ArrayLike<SpeechRecognitionResultLike> }) => void) | null
  onend: (() => void) | null
  onerror: ((event: { error: string }) => void) | null
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
}

function playTone(context: AudioContext, frequency: number, duration: number) {
  const oscillator = context.createOscillator()
  const gain = context.createGain()
  const startAt = context.currentTime + 0.02

  oscillator.type = 'sine'
  oscillator.frequency.value = frequency
  gain.gain.setValueAtTime(0.0001, startAt)
  gain.gain.exponentialRampToValueAtTime(0.055, startAt + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration)
  oscillator.connect(gain).connect(context.destination)
  oscillator.start(startAt)
  oscillator.stop(startAt + duration + 0.02)
}

function phaseCopy(phase: GuidedSetPhase) {
  return phase === 'eccentric'
    ? { label: 'LOWER', description: 'Controlled eccentric' }
    : { label: 'LIFT', description: 'Controlled concentric' }
}

export function GuidedSet({
  exerciseName,
  setNumber,
  targetReps,
  weight,
  unit,
  onComplete,
  onClose,
}: {
  exerciseName: string
  setNumber: number
  targetReps: number
  weight: string
  unit: string
  onComplete: (completedReps: number) => void
  onClose: () => void
}) {
  const [status, setStatus] = useState<GuidedSetStatus>('idle')
  const [elapsedMs, setElapsedMs] = useState(0)
  const [voiceStatus, setVoiceStatus] = useState<
    'checking' | 'listening' | 'unsupported' | 'unavailable'
  >('checking')
  const audioContextRef = useRef<AudioContext | null>(null)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const readyTimeoutRef = useRef<number | null>(null)
  const readyStartedAtRef = useRef<number | null>(null)
  const runningStartedAtRef = useRef<number | null>(null)
  const accumulatedMsRef = useRef(0)
  const lastCueSecondRef = useRef(-1)
  const stoppingRef = useRef(false)
  const voiceCanRestartRef = useRef(true)
  const voiceRestartCountRef = useRef(0)
  const finishSetRef = useRef<() => Promise<void>>(() => Promise.resolve())

  const stopAnimation = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
  }, [])

  const clearReadyTimeout = useCallback(() => {
    if (readyTimeoutRef.current !== null) {
      window.clearTimeout(readyTimeoutRef.current)
      readyTimeoutRef.current = null
    }
  }, [])

  const stopRecognition = useCallback(() => {
    const recognition = recognitionRef.current
    recognitionRef.current = null
    if (!recognition) return
    recognition.onresult = null
    recognition.onend = null
    recognition.onerror = null
    try {
      recognition.stop()
    } catch {
      // The browser may already have ended recognition.
    }
  }, [])

  const releaseWakeLock = useCallback(() => {
    const sentinel = wakeLockRef.current
    wakeLockRef.current = null
    if (sentinel) void sentinel.release().catch(() => undefined)
  }, [])

  const closeAudio = useCallback(() => {
    const context = audioContextRef.current
    audioContextRef.current = null
    if (context) void context.close().catch(() => undefined)
  }, [])

  const currentElapsed = useCallback(() => {
    if (runningStartedAtRef.current === null) return accumulatedMsRef.current
    return accumulatedMsRef.current + performance.now() - runningStartedAtRef.current
  }, [])

  const playCue = useCallback((second: number) => {
    const context = audioContextRef.current
    if (!context || context.state !== 'running') return
    // The lift cue is higher and longer than the lowering beats.
    const isLift = second % 4 === 3
    playTone(context, isLift ? 880 : 440, isLift ? 0.12 : 0.07)
  }, [])

  const requestWakeLock = useCallback(() => {
    if (!navigator.wakeLock || wakeLockRef.current) return
    void navigator.wakeLock
      .request('screen')
      .then((sentinel) => {
        wakeLockRef.current = sentinel
      })
      .catch(() => undefined)
  }, [])

  const startRecognition = useCallback(() => {
    if (recognitionRef.current || typeof window === 'undefined') return
    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition
    if (!Recognition) {
      setVoiceStatus('unsupported')
      return
    }

    const recognition = new Recognition()
    recognition.continuous = true
    recognition.interimResults = false
    recognition.lang = 'en-US'
    recognition.onresult = (event) => {
      for (let index = 0; index < event.results.length; index += 1) {
        const result = event.results[index]
        if (result.isFinal && isVoiceStopCommand(result[0]?.transcript ?? '')) {
          void finishSetRef.current()
          return
        }
      }
    }
    recognition.onerror = (event) => {
      if (
        event.error === 'not-allowed' ||
        event.error === 'service-not-allowed' ||
        event.error === 'audio-capture'
      ) {
        voiceCanRestartRef.current = false
        setVoiceStatus('unavailable')
      }
    }
    recognition.onend = () => {
      if (!voiceCanRestartRef.current || stoppingRef.current) return
      if (voiceRestartCountRef.current >= 2) {
        setVoiceStatus('unavailable')
        return
      }
      voiceRestartCountRef.current += 1
      try {
        recognition.start()
      } catch {
        setVoiceStatus('unavailable')
      }
    }

    recognitionRef.current = recognition
    try {
      recognition.start()
      setVoiceStatus('listening')
    } catch {
      recognitionRef.current = null
      setVoiceStatus('unavailable')
    }
  }, [])

  const pauseSet = useCallback(() => {
    if (runningStartedAtRef.current === null) return
    accumulatedMsRef.current = currentElapsed()
    runningStartedAtRef.current = null
    stopAnimation()
    stopRecognition()
    releaseWakeLock()
    setElapsedMs(accumulatedMsRef.current)
    setStatus('paused')
  }, [currentElapsed, releaseWakeLock, stopAnimation, stopRecognition])

  const startAnimation = useCallback(() => {
    const tick = () => {
      const elapsed = currentElapsed()
      setElapsedMs(elapsed)
      const wholeSecond = Math.floor(elapsed / 1_000)
      if (wholeSecond !== lastCueSecondRef.current) {
        lastCueSecondRef.current = wholeSecond
        playCue(wholeSecond)
      }
      animationFrameRef.current = requestAnimationFrame(tick)
    }
    animationFrameRef.current = requestAnimationFrame(tick)
  }, [currentElapsed, playCue])

  const startRunning = useCallback(() => {
    if (stoppingRef.current) return
    runningStartedAtRef.current = performance.now()
    lastCueSecondRef.current = -1
    setStatus('running')
    requestWakeLock()
    startRecognition()
    startAnimation()
  }, [requestWakeLock, startAnimation, startRecognition])

  const completeReadyCountdown = useCallback(() => {
    if (readyStartedAtRef.current === null) return
    clearReadyTimeout()
    readyStartedAtRef.current = null
    if (document.hidden) {
      stopRecognition()
      setStatus('paused')
      return
    }
    accumulatedMsRef.current = 0
    startRunning()
  }, [clearReadyTimeout, startRunning, stopRecognition])

  const finishSet = useCallback(async () => {
    if (stoppingRef.current || !['ready', 'running', 'paused'].includes(status)) return
    stoppingRef.current = true
    const reps = status === 'ready' ? 0 : getCompletedReps(currentElapsed())
    stopAnimation()
    clearReadyTimeout()
    readyStartedAtRef.current = null
    stopRecognition()
    releaseWakeLock()
    closeAudio()
    onComplete(reps)
  }, [clearReadyTimeout, closeAudio, currentElapsed, onComplete, releaseWakeLock, status, stopAnimation, stopRecognition])

  useEffect(() => {
    finishSetRef.current = finishSet
  }, [finishSet])

  const begin = useCallback(async () => {
    // React Strict Mode intentionally replays effects in development. A prior
    // cleanup must never leave the next user-started set marked as stopping.
    stoppingRef.current = false
    const AudioContextClass =
      window.AudioContext ??
      (window as Window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext
    if (AudioContextClass) {
      try {
        const context = new AudioContextClass()
        audioContextRef.current = context
        await context.resume()
      } catch {
        // Visual guidance remains usable when sound is unavailable.
      }
    }

    voiceCanRestartRef.current = true
    voiceRestartCountRef.current = 0
    setVoiceStatus(
      window.SpeechRecognition || window.webkitSpeechRecognition
        ? 'checking'
        : 'unsupported',
    )
    // Starting from the button gesture gives browser speech APIs the best
    // chance to ask for microphone access before the ready countdown ends.
    startRecognition()
    readyStartedAtRef.current = performance.now()
    setStatus('ready')
    readyTimeoutRef.current = window.setTimeout(
      completeReadyCountdown,
      READY_DURATION_MS,
    )
  }, [completeReadyCountdown, startRecognition])

  const resume = useCallback(() => {
    if (status !== 'paused') return
    stoppingRef.current = false
    startRunning()
  }, [startRunning, status])

  const cancel = useCallback(() => {
    stoppingRef.current = true
    stopAnimation()
    clearReadyTimeout()
    stopRecognition()
    releaseWakeLock()
    closeAudio()
    onClose()
  }, [clearReadyTimeout, closeAudio, onClose, releaseWakeLock, stopAnimation, stopRecognition])

  useEffect(() => {
    const onVisibilityChange = () => {
      if (!document.hidden) return
      if (runningStartedAtRef.current !== null) {
        pauseSet()
      } else if (readyStartedAtRef.current !== null) {
        clearReadyTimeout()
        readyStartedAtRef.current = null
        stopRecognition()
        setStatus('paused')
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [clearReadyTimeout, pauseSet, stopRecognition])

  useEffect(() => {
    if (readyStartedAtRef.current === null || status !== 'ready') return
    let frame = 0
    const tickReady = () => {
      const elapsed = performance.now() - (readyStartedAtRef.current ?? performance.now())
      setElapsedMs(elapsed)
      if (elapsed >= READY_DURATION_MS) {
        completeReadyCountdown()
        return
      }
      frame = requestAnimationFrame(tickReady)
    }
    frame = requestAnimationFrame(tickReady)
    return () => cancelAnimationFrame(frame)
  }, [completeReadyCountdown, status])

  useEffect(() => {

    return () => {
      stoppingRef.current = true

      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
      if (readyTimeoutRef.current !== null) {
        window.clearTimeout(readyTimeoutRef.current)
        readyTimeoutRef.current = null
      }

      const recognition = recognitionRef.current
      recognitionRef.current = null
      if (recognition) {
        recognition.onresult = null
        recognition.onend = null
        recognition.onerror = null
        try {
          recognition.stop()
        } catch {
          // The browser may already have ended recognition.
        }
      }

      const wakeLock = wakeLockRef.current
      wakeLockRef.current = null
      if (wakeLock) void wakeLock.release().catch(() => undefined)

      const audioContext = audioContextRef.current
      audioContextRef.current = null
      if (audioContext) void audioContext.close().catch(() => undefined)
    }
  }, [])

  const snapshot = getTempoSnapshot(elapsedMs)
  const phase = phaseCopy(snapshot.phase)
  const readyCountdown = getReadyCountdown(elapsedMs)
  const canStop = status === 'ready' || status === 'running' || status === 'paused'

  return (
    <div
      className="fixed inset-0 z-50 flex min-h-dvh items-stretch bg-background p-0 sm:items-center sm:justify-center sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-label={`Guided set for ${exerciseName}`}
    >
      <div className="flex max-h-dvh w-full max-w-xl flex-1 flex-col overflow-hidden border border-edge bg-surface sm:max-h-[calc(100dvh-4rem)] sm:flex-none sm:rounded-lg">
        <header className="flex shrink-0 items-start justify-between border-b border-edge border-l-2 border-l-accent px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-accent">Guided set</p>
            <h2 className="mt-1 text-xl font-bold">{exerciseName}</h2>
            <p className="mt-1 text-sm text-muted">
              Set {setNumber} · Target: {targetReps} reps
              {weight ? ` · ${weight} ${unit}` : ''}
            </p>
          </div>
          <button
            type="button"
            className="btn-ghost size-10 px-0"
            onClick={cancel}
            aria-label="Cancel guided set"
          >
            <X className="size-5" />
          </button>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className="flex min-h-full flex-col items-center justify-center px-6 py-4 text-center">
          {status === 'idle' ? (
            <>
              <Volume2 className="size-10 text-accent" />
              <h3 className="mt-5 text-3xl font-bold">Ready for a controlled set?</h3>
              <p className="mt-3 max-w-sm text-muted">
                Lower for 3 seconds, then lift for 1. Only full cycles count.
              </p>
              <button
                type="button"
                className="btn-primary mt-8 min-h-14 px-8 text-base"
                onClick={() => void begin()}
              >
                <Play className="size-5" />
                Start guided set
              </button>
            </>
          ) : status === 'ready' ? (
            <>
              <p className="text-sm font-semibold text-accent">GET READY</p>
              <p className="mt-5 text-8xl font-bold tabular-nums">{readyCountdown}</p>
              <p className="mt-4 text-xl font-semibold">GO</p>
            </>
          ) : status === 'paused' ? (
            <>
              <Pause className="size-10 text-accent" />
              <h3 className="mt-5 text-3xl font-bold">Guided set paused</h3>
              <p className="mt-3 max-w-sm text-muted">
                No reps were counted while this page was hidden. Resume when you are ready.
              </p>
              <p className="mt-6 text-5xl font-bold tabular-nums">{snapshot.completedReps}</p>
              <p className="text-sm text-muted">completed reps</p>
              <button
                type="button"
                className="btn-primary mt-8 min-h-14 px-8 text-base"
                onClick={resume}
              >
                <Play className="size-5" />
                Resume set
              </button>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-accent">{snapshot.completedReps} completed reps · Rep {snapshot.completedReps + 1}</p>
              <p className="mt-4 text-4xl font-bold">{phase.label}</p>
              <p className="mt-2 text-sm text-muted">{phase.description}</p>
              <p className="mt-3 text-7xl font-bold tabular-nums text-accent">
                {snapshot.phaseCountdown}
              </p>
              <div className="mt-4 flex items-center gap-2 text-xs text-muted" aria-live="polite">
                {voiceStatus === 'listening' ? (
                  <Mic className="size-4 text-accent" />
                ) : (
                  <MicOff className="size-4" />
                )}
                {voiceStatus === 'listening'
                  ? 'Listening for “stop”'
                  : voiceStatus === 'unsupported'
                    ? "Voice stop isn't supported here. Use Stop Set."
                    : voiceStatus === 'unavailable'
                      ? 'Voice stop is unavailable. Use Stop Set.'
                      : 'Preparing voice stop...'}
              </div>
            </>
          )}
          </div>
        </main>

        {canStop && (
          <footer className="shrink-0 border-t border-edge p-5">
            <button
              type="button"
              onClick={() => void finishSet()}
              className="btn-danger min-h-16 w-full text-base"
            >
              Stop Set
            </button>
            <button
              type="button"
              onClick={cancel}
              className="mt-3 w-full py-2 text-sm font-medium text-muted hover:text-foreground"
            >
              Back to set timer
            </button>
          </footer>
        )}
      </div>
    </div>
  )
}
