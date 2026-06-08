import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/app/contexts/AuthContext'
import { isMfaRequired } from '@/shared/constants/permissions'
import { getMfaAssuranceLevel, isMfaEnrolled } from '@/features/auth/mfa/api/mfaApi'

type GuardState = 'loading' | 'allow' | 'enroll' | 'challenge'

export function MfaGuard() {
  const { profil } = useAuth()
  const location = useLocation()
  const [state, setState] = useState<GuardState>('loading')

  useEffect(() => {
    if (!profil) {
      setState('allow')
      return
    }

    const primaryRole = profil.roles[0]
    if (!primaryRole || !isMfaRequired(primaryRole)) {
      setState('allow')
      return
    }

    async function checkMfa() {
      const [enrolled, assurance] = await Promise.all([
        isMfaEnrolled(),
        getMfaAssuranceLevel(),
      ])

      if (!enrolled) {
        setState('enroll')
        return
      }

      // User has MFA enrolled but session is still aal1 (challenge not yet verified this session)
      if (assurance.currentLevel !== 'aal2') {
        setState('challenge')
        return
      }

      setState('allow')
    }

    checkMfa()
  }, [profil])

  if (state === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-primary-500" size={32} />
      </div>
    )
  }

  if (state === 'enroll') {
    return <Navigate to="/mfa/enroll" state={{ from: location }} replace />
  }

  if (state === 'challenge') {
    return <Navigate to="/mfa/challenge" state={{ from: location }} replace />
  }

  return <Outlet />
}
