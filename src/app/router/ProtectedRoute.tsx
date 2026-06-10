import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/app/contexts/AuthContext'
import { useTenant } from '@/app/contexts/TenantContext'

// Routes qui nécessitent un tenant réel — bloquées en vue nationale
const TENANT_REQUIRED_PREFIXES = [
  '/budget',
  '/engagements',
  '/liquidations',
  '/ordonnancement',
  '/recettes',
  '/matieres',
  '/comptes-admin',
  '/reporting',
]

export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth()
  const { isNationalView }             = useTenant()
  const location                       = useLocation()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-primary-500" size={32} />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // SUPER_ADMIN en vue nationale : rediriger vers le dashboard national
  // si une route ministère est demandée
  if (isNationalView) {
    const requiresTenant = TENANT_REQUIRED_PREFIXES.some(
      (prefix) => location.pathname.startsWith(prefix)
    )
    if (requiresTenant) {
      return <Navigate to="/super-admin/dashboard" replace />
    }
  }

  return <Outlet />
}
