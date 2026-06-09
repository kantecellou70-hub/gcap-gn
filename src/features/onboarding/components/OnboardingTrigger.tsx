import { useEffect } from 'react'
import { useAuth } from '@/app/contexts/AuthContext'
import { getTourForRole } from '../lib/tourConfig'
import { useOnboarding } from '../hooks/useOnboarding'

interface OnboardingTriggerProps {
  /** Exposé pour permettre au parent (ex: TopBar) de relancer manuellement */
  onRegisterStart?: (fn: () => void) => void
}

export function OnboardingTrigger({ onRegisterStart }: OnboardingTriggerProps) {
  const { profil } = useAuth()
  const userId = profil?.id
  const primaryRole = profil?.roles?.[0] ?? 'DAFF'

  const { shouldShowTour, completeTour, startTour } = useOnboarding(userId)

  // Expose startTour au parent si nécessaire
  useEffect(() => {
    if (onRegisterStart) {
      onRegisterStart(startTour)
    }
  }, [onRegisterStart, startTour])

  // Lance le tour automatiquement 1s après le premier accès au dashboard
  useEffect(() => {
    if (!shouldShowTour) return

    const steps = getTourForRole(primaryRole)
    if (steps.length === 0) return

    let cancelled = false

    const timer = setTimeout(async () => {
      if (cancelled) return

      // Import dynamique pour ne pas alourdir le bundle initial
      const { driver } = await import('driver.js')
      await import('driver.js/dist/driver.css')

      if (cancelled) return

      const driverObj = driver({
        showProgress: true,
        nextBtnText: 'Suivant →',
        prevBtnText: '← Retour',
        doneBtnText: 'Terminer',
        progressText: '{{current}} / {{total}}',
        onDestroyStarted: () => {
          completeTour()
          driverObj.destroy()
        },
        steps: steps.map((s) => ({
          element: s.element,
          popover: s.popover,
        })),
      })

      driverObj.drive()
    }, 1000)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  // shouldShowTour intentionnellement omis : on ne re-lance pas à chaque render
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primaryRole])

  return null
}
