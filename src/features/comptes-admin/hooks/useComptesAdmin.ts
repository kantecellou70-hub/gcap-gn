import { useQuery } from '@tanstack/react-query'
import { useTenant, NATIONAL_TENANT_ID } from '@/app/contexts/TenantContext'
import { fetchRAL, fetchRAP } from '../api/comptes-admin-api'

export function useRAL(exerciceId: string) {
  const { tenantId } = useTenant()
  return useQuery({
    queryKey: ['ral', exerciceId, tenantId],
    queryFn:  () => fetchRAL(exerciceId, tenantId!),
    enabled:  !!tenantId && tenantId !== NATIONAL_TENANT_ID && !!exerciceId,
    staleTime: 60_000,
  })
}

export function useRAP() {
  const { tenantId } = useTenant()
  return useQuery({
    queryKey: ['rap', tenantId],
    queryFn:  () => fetchRAP(tenantId!),
    enabled:  !!tenantId && tenantId !== NATIONAL_TENANT_ID,
    staleTime: 60_000,
  })
}
