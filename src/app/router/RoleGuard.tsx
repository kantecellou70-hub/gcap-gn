import type { ReactNode } from 'react'
import { useAuth } from '@/app/contexts/AuthContext'
import { canDo } from '@/shared/lib/utils'
import type { Permission } from '@/shared/constants/permissions'

interface RoleGuardProps {
  permission: Permission
  children: ReactNode
  fallback?: ReactNode
}

export function RoleGuard({ permission, children, fallback }: RoleGuardProps) {
  const { profil } = useAuth()
  const roles = profil?.roles ?? []

  if (!canDo(permission, roles)) {
    return fallback ? <>{fallback}</> : null
  }

  return <>{children}</>
}
