import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck, Loader2 } from 'lucide-react'
import { LogoGCAPGN } from '@/shared/components/LogoGCAPGN'
import { cn } from '@/shared/lib/utils'
import { OtpInput } from '../components/OtpInput'
import { listMfaFactors, verifyMfaChallenge } from '../api/mfaApi'
import type { MfaFactor } from '../api/mfaApi'

export function MfaChallengePage() {
  const navigate = useNavigate()
  const [factors, setFactors] = useState<MfaFactor[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [verifying, setVerifying] = useState(false)
  const [otpError, setOtpError] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    listMfaFactors().then((f) => {
      setFactors(f)
      setIsLoading(false)
    })
  }, [])

  const activeFactor = factors.find((f) => f.status === 'verified') ?? null

  async function handleVerify(code: string) {
    if (!activeFactor) return
    setVerifying(true)
    setOtpError(false)
    setErrorMsg(null)
    try {
      await verifyMfaChallenge(activeFactor.id, code)
      navigate('/', { replace: true })
    } catch {
      setOtpError(true)
      setErrorMsg('Code incorrect. Vérifiez l\'heure de votre appareil et réessayez.')
    } finally {
      setVerifying(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">

        {/* En-tête */}
        <div className="px-8 pt-8 pb-6 flex flex-col items-center gap-4">
          <LogoGCAPGN size="lg" variant="dark" />
          <div className="flex w-full h-[3px] rounded-full overflow-hidden">
            <span className="flex-1 bg-[#CE1126]" />
            <span className="flex-1 bg-[#FCD116]" />
            <span className="flex-1 bg-[#009460]" />
          </div>
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
              <ShieldCheck className="text-indigo-600" size={24} />
            </div>
            <h1 className="text-xl font-semibold text-slate-900">Vérification en deux étapes</h1>
            <p className="text-sm text-slate-500">
              Entrez le code de votre application d'authentification.
            </p>
          </div>
        </div>

        <div className="px-8 pb-6 flex flex-col items-center gap-5">
          {isLoading ? (
            <Loader2 size={24} className="animate-spin text-indigo-500" />
          ) : !activeFactor ? (
            <div className="w-full rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 text-center">
              Aucun factor MFA trouvé. Contactez votre administrateur.
            </div>
          ) : (
            <>
              <OtpInput
                onComplete={handleVerify}
                disabled={verifying}
                error={otpError}
                autoFocus
              />

              {errorMsg && (
                <div className="w-full rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 text-center">
                  {errorMsg}
                </div>
              )}

              {verifying && (
                <Loader2 size={20} className="animate-spin text-indigo-500" />
              )}

              <button
                type="button"
                onClick={() => handleVerify('')}
                className={cn(
                  'w-full flex items-center justify-center rounded-lg px-4 py-2.5',
                  'bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm',
                  'transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
                )}
                disabled={verifying}
              >
                {verifying ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
                Vérifier
              </button>
            </>
          )}
        </div>

        <div className="px-8 py-4 border-t border-slate-100 text-center">
          <a
            href="mailto:support@lynxatech.gn"
            className="text-xs text-slate-400 hover:text-indigo-600 transition-colors"
          >
            J'ai perdu accès à mon application
          </a>
          <p className="mt-1 text-xs text-slate-400">© 2026 LYNXA SARL · Conakry, Guinée</p>
        </div>
      </div>
    </div>
  )
}
