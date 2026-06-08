import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/app/contexts/AuthContext'
import { isMfaRequired } from '@/shared/constants/permissions'
import {
  enrollTotp,
  isMfaEnrolled,
  listMfaFactors,
  unenrollFactor,
  verifyAndActivateTotp,
  verifyMfaChallenge,
} from '../api/mfaApi'
import type { MfaFactor } from '../api/mfaApi'

interface UseMfaReturn {
  isEnrolled: boolean
  isRequired: boolean
  factors: MfaFactor[]
  isLoading: boolean
  enrollTotp: () => Promise<{ qrCode: string; secret: string; factorId: string }>
  verifyEnrollment: (factorId: string, code: string) => Promise<void>
  unenrollFactor: (factorId: string) => Promise<void>
  verifyChallenge: (factorId: string, code: string) => Promise<void>
}

export function useMfa(): UseMfaReturn {
  const { profil } = useAuth()
  const [isEnrolled, setIsEnrolled] = useState(false)
  const [factors, setFactors] = useState<MfaFactor[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const primaryRole = profil?.roles[0] ?? null
  const isRequired = primaryRole ? isMfaRequired(primaryRole) : false

  const refresh = useCallback(async () => {
    setIsLoading(true)
    try {
      const [enrolled, factorList] = await Promise.all([isMfaEnrolled(), listMfaFactors()])
      setIsEnrolled(enrolled)
      setFactors(factorList)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (profil) {
      refresh()
    }
  }, [profil, refresh])

  const handleEnrollTotp = useCallback(async () => {
    const result = await enrollTotp()
    await refresh()
    return result
  }, [refresh])

  const handleVerifyEnrollment = useCallback(async (factorId: string, code: string) => {
    await verifyAndActivateTotp(factorId, code)
    await refresh()
  }, [refresh])

  const handleUnenroll = useCallback(async (factorId: string) => {
    await unenrollFactor(factorId)
    await refresh()
  }, [refresh])

  const handleVerifyChallenge = useCallback(async (factorId: string, code: string) => {
    await verifyMfaChallenge(factorId, code)
    await refresh()
  }, [refresh])

  return {
    isEnrolled,
    isRequired,
    factors,
    isLoading,
    enrollTotp: handleEnrollTotp,
    verifyEnrollment: handleVerifyEnrollment,
    unenrollFactor: handleUnenroll,
    verifyChallenge: handleVerifyChallenge,
  }
}
