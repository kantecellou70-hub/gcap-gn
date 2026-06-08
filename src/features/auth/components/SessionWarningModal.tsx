import { Clock } from 'lucide-react'
import { supabase } from '@/shared/lib/supabase'
import { cn } from '@/shared/lib/utils'

interface SessionWarningModalProps {
  remainingMs: number
  onStayConnected: () => void
  onClose?: () => void
}

function formatRemaining(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes > 0) return `${minutes} min ${seconds} s`
  return `${seconds} s`
}

export function SessionWarningModal({ remainingMs, onStayConnected, onClose }: SessionWarningModalProps) {
  const WARNING_DURATION = 5 * 60 * 1000
  const progressPct = Math.max(0, Math.min(100, (remainingMs / WARNING_DURATION) * 100))

  async function handleSignOut() {
    await supabase.auth.signOut()
    onClose?.()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg border border-amber-200 mx-4">
        <div className="px-6 pt-6 pb-4 flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
            <Clock className="text-amber-600" size={24} />
          </div>
          <h2 className="text-lg font-semibold text-slate-900">Votre session va expirer</h2>
          <p className="text-sm text-slate-600">
            Vous allez être déconnecté dans{' '}
            <span className="font-semibold text-amber-700">{formatRemaining(remainingMs)}</span>{' '}
            par inactivité.
          </p>

          {/* Barre de progression */}
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className={cn('h-2 rounded-full transition-all duration-1000', progressPct > 30 ? 'bg-amber-400' : 'bg-red-500')}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={handleSignOut}
            className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Se déconnecter
          </button>
          <button
            onClick={onStayConnected}
            className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
          >
            Rester connecté
          </button>
        </div>
      </div>
    </div>
  )
}
