import { useNavigate } from 'react-router-dom'
import { Eye, ArrowLeft } from 'lucide-react'
import { useTenant } from '@/app/contexts/TenantContext'

export function ImpersonationBanner() {
  const { isImpersonating, tenantActif, resetTenant } = useTenant()
  const navigate = useNavigate()

  if (!isImpersonating) return null

  function handleRetour() {
    resetTenant()
    navigate('/super-admin/dashboard')
  }

  return (
    <div className="sticky top-0 z-30 flex items-center gap-3 bg-blue-600 px-4 py-2.5 text-white shadow-sm">
      <Eye size={15} className="shrink-0" />
      <span className="text-sm font-medium">
        Inspection : <strong>{tenantActif?.nom}</strong>
      </span>
      <span className="text-blue-200 text-sm hidden sm:inline">
        — Vous naviguez en tant que SUPER_ADMIN dans ce ministère.
      </span>
      <button
        type="button"
        onClick={handleRetour}
        className="ml-auto flex items-center gap-1.5 rounded-md bg-blue-500 px-3 py-1 text-sm font-medium hover:bg-blue-400 transition-colors"
      >
        <ArrowLeft size={13} />
        Revenir à la vue nationale
      </button>
    </div>
  )
}
