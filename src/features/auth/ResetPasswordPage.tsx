import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/shared/lib/supabase'
import { LogoGCAPGN } from '@/shared/components/LogoGCAPGN'
import { cn } from '@/shared/lib/utils'
import { Loader2, CheckCircle } from 'lucide-react'

export function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error: err } = await supabase.auth.resetPasswordForEmail(email)
    if (err) setError('Erreur lors de l\'envoi. Vérifiez l\'email.')
    else setSent(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-8 pt-8 pb-6 flex flex-col items-center gap-4">
          <LogoGCAPGN size="md" variant="dark" />
          <div className="text-center">
            <h1 className="text-xl font-semibold text-slate-900">Réinitialisation</h1>
            <p className="text-sm text-slate-500 mt-1">Un lien vous sera envoyé par email</p>
          </div>
        </div>
        <div className="px-8 pb-8">
          {sent ? (
            <div className="flex flex-col items-center gap-3 text-center py-4">
              <CheckCircle className="text-green-500" size={40} />
              <p className="text-sm text-slate-600">Email envoyé. Vérifiez votre boîte de réception.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Adresse email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className={cn(
                    'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm',
                    'focus:outline-none focus:ring-2 focus:ring-primary-500',
                    'disabled:opacity-50'
                  )}
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm disabled:opacity-50"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                Envoyer le lien
              </button>
              <p className="text-center text-sm">
                <Link to="/login" className="text-slate-500 hover:text-indigo-600">← Retour à la connexion</Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
