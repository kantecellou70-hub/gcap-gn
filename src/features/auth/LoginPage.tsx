import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { useAuth } from '@/app/contexts/AuthContext'
import { LogoGCAPGN } from '@/shared/components/LogoGCAPGN'
import { cn } from '@/shared/lib/utils'

const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Mot de passe trop court'),
})

type LoginFormData = z.infer<typeof loginSchema>

function translateAuthError(msg: string): string {
  if (msg.includes('Invalid login credentials')) return 'Email ou mot de passe incorrect.'
  if (msg.includes('Email not confirmed')) return 'Veuillez confirmer votre email.'
  return 'Erreur de connexion. Réessayez.'
}

export function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) })

  async function onSubmit(data: LoginFormData) {
    setErrorMsg(null)
    try {
      await signIn(data.email, data.password)
      navigate('/')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue'
      setErrorMsg(translateAuthError(msg))
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">

        {/* En-tête */}
        <div className="px-8 pt-8 pb-6 flex flex-col items-center gap-4">
          <LogoGCAPGN size="lg" variant="dark" />
          {/* Bandeau tricolore guinéen */}
          <div className="flex w-full h-[3px] rounded-full overflow-hidden">
            <span className="flex-1 bg-[#CE1126]" />
            <span className="flex-1 bg-[#FCD116]" />
            <span className="flex-1 bg-[#009460]" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-semibold text-slate-900">Connexion</h1>
            <p className="text-sm text-slate-500 mt-1">
              Gestion Comptable Administrative Publique
            </p>
          </div>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit(onSubmit)} className="px-8 pb-6 flex flex-col gap-4">

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Adresse email
            </label>
            <input
              {...register('email')}
              type="email"
              placeholder="votre@ministere.gov.gn"
              disabled={isSubmitting}
              className={cn(
                'w-full rounded-lg border px-3 py-2 text-sm text-slate-900 placeholder-slate-400',
                'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                errors.email ? 'border-red-400' : 'border-slate-300'
              )}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
            )}
          </div>

          {/* Mot de passe */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Mot de passe
            </label>
            <div className="relative">
              <input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                disabled={isSubmitting}
                className={cn(
                  'w-full rounded-lg border px-3 py-2 pr-10 text-sm text-slate-900',
                  'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  errors.password ? 'border-red-400' : 'border-slate-300'
                )}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
            )}
          </div>

          {/* Erreur globale */}
          {errorMsg && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {errorMsg}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className={cn(
              'w-full flex items-center justify-center gap-2 rounded-lg px-4 py-2.5',
              'bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm',
              'transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {isSubmitting && <Loader2 size={16} className="animate-spin" />}
            {isSubmitting ? 'Connexion…' : 'Se connecter'}
          </button>

          {/* Mot de passe oublié */}
          <p className="text-center text-sm">
            <Link
              to="/reset-password"
              className="text-slate-500 hover:text-indigo-600 transition-colors"
            >
              Mot de passe oublié ?
            </Link>
          </p>
        </form>

        {/* Pied de carte */}
        <div className="px-8 py-4 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-400">
            © 2026 LYNXA SARL · Conakry, Guinée
          </p>
        </div>
      </div>
    </div>
  )
}
