import { useState } from 'react'
import { FlaskConical, RotateCcw, X } from 'lucide-react'
import { useTenant } from '@/app/contexts/TenantContext'
import { useAuth } from '@/app/contexts/AuthContext'

export function SandboxBanner() {
  const { tenant } = useTenant()
  const { profil } = useAuth()
  const [dismissed, setDismissed] = useState(false)

  // N'afficher que sur le tenant SANDBOX
  if (tenant?.code !== 'SANDBOX') return null
  if (dismissed) return null

  const roles = profil?.roles ?? []
  const canReset = roles.includes('SUPER_ADMIN') || roles.includes('ADMIN_MINISTERE')

  function handleReset() {
    // Rafraîchissement de la page pour simuler une réinitialisation
    // La vraie réinitialisation nécessite un appel backend — à brancher sur l'API seed
    if (confirm('Réinitialiser les données de formation ? Toutes les modifications seront perdues.')) {
      window.location.reload()
    }
  }

  return (
    <div
      role="status"
      aria-label="Mode formation actif"
      className="sticky top-0 z-40 flex items-center justify-between gap-3 bg-violet-600 px-4 py-2 text-white text-sm"
    >
      <div className="flex items-center gap-2">
        <FlaskConical size={16} aria-hidden="true" className="shrink-0" />
        <span>
          <strong>Mode Formation</strong> — Les données sont fictives. Aucun impact sur la production.
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {canReset && (
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 rounded-md bg-violet-700 hover:bg-violet-800 px-3 py-1 text-xs font-medium transition-colors"
          >
            <RotateCcw size={12} aria-hidden="true" />
            Réinitialiser les données
          </button>
        )}
        <button
          type="button"
          aria-label="Fermer la bannière de formation"
          onClick={() => setDismissed(true)}
          className="rounded p-1 hover:bg-violet-700 transition-colors"
        >
          <X size={14} aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
