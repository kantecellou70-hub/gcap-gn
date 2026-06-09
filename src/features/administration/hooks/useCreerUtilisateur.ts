import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  fetchTenantsAvecStats,
  updateTenantStatut,
  creerUtilisateurMinistere,
} from '../api/tenantsAdmin-api'
import type { CreateMinistereUserPayload } from '../api/tenantsAdmin-api'

export function useTenantsAvecStats() {
  return useQuery({
    queryKey: ['tenants-stats'],
    queryFn:  fetchTenantsAvecStats,
    staleTime: 30_000,
  })
}

export function useUpdateTenantStatut() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ tenantId, statut }: { tenantId: string; statut: 'ACTIF' | 'SUSPENDU' }) =>
      updateTenantStatut(tenantId, statut),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tenants-stats'] })
      toast.success('Statut du ministère mis à jour.')
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue'
      toast.error(`Impossible : ${msg}`)
    },
  })
}

export function useCreerUtilisateurMinistere() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateMinistereUserPayload) => creerUtilisateurMinistere(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tenants-stats'] })
      toast.success('Invitation envoyée avec succès.')
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue'
      toast.error(`Erreur : ${msg}`)
    },
  })
}
