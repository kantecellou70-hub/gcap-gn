import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/app/contexts/AuthContext'
import { STALE_TIMES } from '@/shared/lib/queryClient'
import {
  fetchExecutionNationale,
  fetchAlertesNationales,
  fetchNationalExercices,
  fetchEvolutionMensuelle,
} from '../api/m9Api'

function useRoles() {
  const { profil } = useAuth()
  return profil?.roles ?? []
}

export function useExecutionNationale(annee: number) {
  const roles = useRoles()
  return useQuery({
    queryKey: ['m9', 'execution-nationale', annee],
    queryFn: () => fetchExecutionNationale(annee, roles),
    staleTime: STALE_TIMES.MEDIUM,
    enabled: annee > 0 && roles.length > 0,
  })
}

export function useAlertesNationales() {
  const roles = useRoles()
  return useQuery({
    queryKey: ['m9', 'alertes-nationales'],
    queryFn: () => fetchAlertesNationales(roles),
    staleTime: STALE_TIMES.MEDIUM,
    enabled: roles.length > 0,
  })
}

export function useNationalExercices() {
  const roles = useRoles()
  return useQuery({
    queryKey: ['m9', 'national-exercices'],
    queryFn: () => fetchNationalExercices(roles),
    staleTime: STALE_TIMES.MEDIUM,
    enabled: roles.length > 0,
  })
}

export function useEvolutionMensuelle(tenantId: string, annee: number) {
  const roles = useRoles()
  return useQuery({
    queryKey: ['m9', 'evolution-mensuelle', tenantId, annee],
    queryFn: () => fetchEvolutionMensuelle(tenantId, annee, roles),
    staleTime: STALE_TIMES.MEDIUM,
    enabled: !!tenantId && annee > 0 && roles.length > 0,
  })
}
