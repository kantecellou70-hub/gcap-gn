import { useQuery } from '@tanstack/react-query'
import { useTenant } from '@/app/contexts/TenantContext'
import { fetchRAL, fetchRAP } from '../api/comptes-admin-api'

export function useRAL(exerciceId: string) {
  const { tenantId } = useTenant()
  return useQuery({
    queryKey: ['ral', exerciceId, tenantId],
    queryFn:  () => fetchRAL(exerciceId, tenantId!),
    enabled:  !!tenantId && !!exerciceId,
    staleTime: 60_000,
  })
}

export function useRAP() {
  const { tenantId } = useTenant()
  return useQuery({
    queryKey: ['rap', tenantId],
    queryFn:  () => fetchRAP(tenantId!),
    enabled:  !!tenantId,
    staleTime: 60_000,
  })
}
