import { useState, useCallback } from 'react'

export interface UseOnboardingReturn {
  shouldShowTour: boolean
  startTour: () => void
  completeTour: () => void
  resetTour: () => void
}

function storageKey(userId: string): string {
  return `gcap-tour-completed-${userId}`
}

export function useOnboarding(userId: string | undefined): UseOnboardingReturn {
  const key = userId ? storageKey(userId) : null

  const [shouldShowTour, setShouldShowTour] = useState<boolean>(() => {
    if (!key) return false
    return localStorage.getItem(key) === null
  })

  const completeTour = useCallback(() => {
    if (key) {
      localStorage.setItem(key, new Date().toISOString())
    }
    setShouldShowTour(false)
  }, [key])

  const startTour = useCallback(() => {
    setShouldShowTour(true)
  }, [])

  const resetTour = useCallback(() => {
    if (key) {
      localStorage.removeItem(key)
    }
    setShouldShowTour(true)
  }, [key])

  return { shouldShowTour, startTour, completeTour, resetTour }
}
