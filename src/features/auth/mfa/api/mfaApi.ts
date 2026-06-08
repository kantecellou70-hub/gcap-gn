import { supabase } from '@/shared/lib/supabase'

export interface MfaFactor {
  id: string
  type: 'totp'
  status: 'verified' | 'unverified'
  friendly_name: string | null
  created_at: string
}

export async function enrollTotp(): Promise<{
  qrCode: string
  secret: string
  factorId: string
}> {
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' })
  if (error || !data) throw error ?? new Error('Échec de l\'enrollment TOTP')

  return {
    qrCode: data.totp.qr_code,
    secret: data.totp.secret,
    factorId: data.id,
  }
}

export async function verifyAndActivateTotp(factorId: string, code: string): Promise<void> {
  const { error: challengeError, data: challengeData } = await supabase.auth.mfa.challenge({ factorId })
  if (challengeError || !challengeData) throw challengeError ?? new Error('Échec du challenge MFA')

  const { error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challengeData.id,
    code,
  })
  if (error) throw error
}

export async function listMfaFactors(): Promise<MfaFactor[]> {
  const { data, error } = await supabase.auth.mfa.listFactors()
  if (error || !data) return []
  // Supabase Factor type differs from our MfaFactor — map explicitly
  return data.totp.map((f) => ({
    id: f.id,
    type: 'totp' as const,
    status: f.status as 'verified' | 'unverified',
    friendly_name: f.friendly_name ?? null,
    created_at: f.created_at,
  }))
}

export async function unenrollFactor(factorId: string): Promise<void> {
  const { error } = await supabase.auth.mfa.unenroll({ factorId })
  if (error) throw error
}

export async function verifyMfaChallenge(factorId: string, code: string): Promise<void> {
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code })
  if (error) throw error
}

export async function isMfaEnrolled(): Promise<boolean> {
  const factors = await listMfaFactors()
  return factors.some((f) => f.status === 'verified')
}

export async function getMfaAssuranceLevel(): Promise<{
  currentLevel: 'aal1' | 'aal2' | null
  nextLevel: 'aal1' | 'aal2' | null
}> {
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  if (error || !data) return { currentLevel: null, nextLevel: null }
  return data as { currentLevel: 'aal1' | 'aal2' | null; nextLevel: 'aal1' | 'aal2' | null }
}
