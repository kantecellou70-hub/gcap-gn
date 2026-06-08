import { useCallback, useEffect, useRef, useState } from 'react'

const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000 // 30 min
const DEFAULT_WARNING_MS = 5 * 60 * 1000  // 5 min before

export interface UseInactivityTimeoutOptions {
  timeoutMs?: number
  warningMs?: number
  onWarning?: () => void
  onTimeout?: () => void
}

export function useInactivityTimeout(options?: UseInactivityTimeoutOptions): {
  resetTimer: () => void
  remainingMs: number
} {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const warningMs = options?.warningMs ?? DEFAULT_WARNING_MS
  const onWarning = options?.onWarning
  const onTimeout = options?.onTimeout

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const warningRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number>(Date.now())
  const warningFiredRef = useRef(false)
  const [remainingMs, setRemainingMs] = useState(timeoutMs)

  const clearAllTimers = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    if (warningRef.current) clearTimeout(warningRef.current)
    if (intervalRef.current) clearInterval(intervalRef.current)
  }, [])

  const startTimers = useCallback(() => {
    clearAllTimers()
    warningFiredRef.current = false
    startTimeRef.current = Date.now()
    setRemainingMs(timeoutMs)

    warningRef.current = setTimeout(() => {
      warningFiredRef.current = true
      onWarning?.()
    }, timeoutMs - warningMs)

    timeoutRef.current = setTimeout(() => {
      onTimeout?.()
    }, timeoutMs)

    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current
      const remaining = Math.max(0, timeoutMs - elapsed)
      setRemainingMs(remaining)
    }, 1000)
  }, [clearAllTimers, timeoutMs, warningMs, onWarning, onTimeout])

  const resetTimer = useCallback(() => {
    startTimers()
  }, [startTimers])

  useEffect(() => {
    const EVENTS = ['mousemove', 'keydown', 'click', 'touchstart', 'scroll']

    const handleActivity = () => {
      if (document.visibilityState === 'hidden') return
      resetTimer()
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        resetTimer()
      } else {
        // Suspend timers while tab is hidden
        clearAllTimers()
      }
    }

    EVENTS.forEach((e) => document.addEventListener(e, handleActivity, { passive: true }))
    document.addEventListener('visibilitychange', handleVisibility)

    startTimers()

    return () => {
      EVENTS.forEach((e) => document.removeEventListener(e, handleActivity))
      document.removeEventListener('visibilitychange', handleVisibility)
      clearAllTimers()
    }
  }, [startTimers, resetTimer, clearAllTimers])

  return { resetTimer, remainingMs }
}
