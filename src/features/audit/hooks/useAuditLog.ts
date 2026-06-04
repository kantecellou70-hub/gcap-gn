import { useQuery } from '@tanstack/react-query'
import { useTenant } from '@/app/contexts/TenantContext'
import { fetchAuditLogs, fetchAuditUsers } from '../api/audit-api'
import type { AuditFiltres } from '../types'

export function useAuditLog(filtres: AuditFiltres = {}) {
  const { tenantId } = useTenant()
  return useQuery({
    queryKey:  ['audit-log', tenantId, filtres],
    queryFn:   () => fetchAuditLogs(filtres, tenantId!),
    enabled:   !!tenantId,
    staleTime: 60_000,
  })
}

export function useAuditUsers() {
  const { tenantId } = useTenant()
  return useQuery({
    queryKey:  ['audit-users', tenantId],
    queryFn:   () => fetchAuditUsers(tenantId!),
    enabled:   !!tenantId,
    staleTime: 300_000,
  })
}
