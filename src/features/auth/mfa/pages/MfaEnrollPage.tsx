import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, ChevronRight, Copy, Check, Loader2 } from 'lucide-react'
import { useAuth } from '@/app/contexts/AuthContext'
import { LogoGCAPGN } from '@/shared/components/LogoGCAPGN'
import { cn } from '@/shared/lib/utils'
import { OtpInput } from '../components/OtpInput'
import { enrollTotp, verifyAndActivateTotp } from '../api/mfaApi'

type Step = 'intro' | 'qrcode' | 'verify'

export function MfaEnrollPage() {
  const { profil } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState<Step>('intro')
  const [qrCode, setQrCode] = useState('')
  const [secret, setSecret] = useState('')
  const [factorId, setFactorId] = useState('')
  const [showSecret, setShowSecret] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [otpError, setOtpError] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const role = profil?.roles[0] ?? 'ORDONNATEUR'
  const roleLabel: Record<string, string> = {
    SUPER_ADMIN: 'Super Administrateur LYNXA',
    ORDONNATEUR: 'Ordonnateur',
    CF: 'Contrôleur Financier',
  }

  async function handleStartEnroll() {
    setIsLoading(true)
    setErrorMsg(null)
    try {
      const result = await enrollTotp()
      setQrCode(result.qrCode)
      setSecret(result.secret)
      setFactorId(result.factorId)
      setStep('qrcode')
    } catch {
      setErrorMsg('Impossible de démarrer la configuration. Réessayez.')
    } finally {
      setIsLoading(false)
    }
  }

  function handleCopySecret() {
    navigator.clipboard.writeText(secret).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  async function handleVerify(code: string) {
    setIsLoading(true)
    setOtpError(false)
    setErrorMsg(null)
    try {
      await verifyAndActivateTotp(factorId, code)
      setSuccess(true)
      setTimeout(() => navigate('/tableau-de-bord', { replace: true }), 2000)
    } catch {
      setOtpError(true)
      setErrorMsg('Code incorrect. Vérifiez l\'heure de votre appareil et réessayez.')
    } finally {
      setIsLoading(false)
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
        </div>

        {/* Étape 1 — Introduction */}
        {step === 'intro' && (
          <div className="px-8 pb-8 flex flex-col items-center gap-5 text-center">
            <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center">
              <Shield className="text-indigo-600" size={28} />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-slate-900">Sécurisez votre compte</h1>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                En tant que <strong>{roleLabel[role] ?? role}</strong>, le MFA est obligatoire.
                Chaque action est auditée — le second facteur protège les fonds publics guinéens.
              </p>
            </div>
            <div className="w-full rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 text-left">
              Vous aurez besoin de <strong>Google Authenticator</strong>, <strong>Authy</strong> ou{' '}
              <strong>Microsoft Authenticator</strong> sur votre smartphone.
            </div>
            {errorMsg && (
              <div className="w-full rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {errorMsg}
              </div>
            )}
            <button
              onClick={handleStartEnroll}
              disabled={isLoading}
              className={cn(
                'w-full flex items-center justify-center gap-2 rounded-lg px-4 py-2.5',
                'bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm',
                'transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : <ChevronRight size={16} />}
              Configurer l'authentification à deux facteurs
            </button>
          </div>
        )}

        {/* Étape 2 — QR Code */}
        {step === 'qrcode' && (
          <div className="px-8 pb-8 flex flex-col items-center gap-5">
            <div className="text-center">
              <h1 className="text-lg font-semibold text-slate-900">Scannez le QR code</h1>
              <p className="mt-1 text-sm text-slate-500">
                Ouvrez votre application d'authentification et scannez ce code.
              </p>
            </div>

            <div className="border-2 border-slate-200 rounded-xl p-4 bg-white">
              <img src={qrCode} alt="QR Code MFA" className="w-48 h-48" />
            </div>

            <button
              type="button"
              onClick={() => setShowSecret((v) => !v)}
              className="text-sm text-indigo-600 hover:underline"
            >
              {showSecret ? 'Masquer la clé manuelle' : 'Saisie manuelle →'}
            </button>

            {showSecret && (
              <div className="w-full flex items-center gap-2">
                <code className="flex-1 rounded-lg bg-slate-100 border border-slate-200 px-3 py-2 text-xs font-mono text-slate-700 break-all">
                  {secret}
                </code>
                <button
                  onClick={handleCopySecret}
                  className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-700 transition-colors"
                  title="Copier la clé"
                >
                  {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
                </button>
              </div>
            )}

            <button
              onClick={() => setStep('verify')}
              className={cn(
                'w-full flex items-center justify-center gap-2 rounded-lg px-4 py-2.5',
                'bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-colors'
              )}
            >
              <ChevronRight size={16} />
              J'ai scanné le QR code
            </button>
          </div>
        )}

        {/* Étape 3 — Vérification */}
        {step === 'verify' && (
          <div className="px-8 pb-8 flex flex-col items-center gap-5 text-center">
            {success ? (
              <>
                <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                  <Check className="text-green-600" size={28} />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-slate-900">MFA activé</h1>
                  <p className="mt-1 text-sm text-slate-500">
                    Votre compte est maintenant sécurisé. Redirection…
                  </p>
                </div>
              </>
            ) : (
              <>
                <div>
                  <h1 className="text-lg font-semibold text-slate-900">Entrez le code de vérification</h1>
                  <p className="mt-1 text-sm text-slate-500">
                    Saisissez le code à 6 chiffres affiché dans votre application.
                  </p>
                </div>

                <OtpInput
                  onComplete={handleVerify}
                  disabled={isLoading}
                  error={otpError}
                  autoFocus
                />

                {errorMsg && (
                  <div className="w-full rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 text-left">
                    {errorMsg}
                  </div>
                )}

                {isLoading && (
                  <Loader2 size={20} className="animate-spin text-indigo-500" />
                )}
              </>
            )}
          </div>
        )}

        <div className="px-8 py-4 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-400">© 2026 LYNXA SARL · Conakry, Guinée</p>
        </div>
      </div>
    </div>
  )
}
