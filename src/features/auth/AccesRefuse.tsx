import { ShieldOff } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export function AccesRefuse() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="flex justify-center mb-4">
          <ShieldOff className="text-slate-300" size={64} strokeWidth={1.5} />
        </div>
        <h1 className="text-2xl font-semibold text-slate-800 mb-2">Accès refusé</h1>
        <p className="text-slate-500 text-sm mb-6">
          Vous n'avez pas les droits pour accéder à cette page.
        </p>
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors"
        >
          Retour au tableau de bord
        </button>
      </div>
    </div>
  )
}
