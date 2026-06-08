import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useTenant } from '@/app/contexts/TenantContext'
import { useAuth } from '@/app/contexts/AuthContext'
import { useServerPagination } from '@/shared/hooks/useServerPagination'
import { STALE_TIMES } from '@/shared/lib/queryClient'
import {
  fetchLiquidations,
  fetchLiquidation,
  fetchLiquidationsByEngagement,
  fetchLiquidationsPaginated,
  fetchEngagementsVises,
  createLiquidation,
  soumettreeLiquidation,
  validerLiquidation,
  rejeterLiquidation,
  annulerLiquidation,
} from '../api/liquidations-api'
import type { LiquidationFiltres, LiquidationInput } from '../types'
import { formatGNF } from '@/shared/lib/utils'

const INVALIDS = ['liquidations', 'engagements', 'engagements-vises', 'lignes-budgetaires']

export function useLiquidations(filtres: LiquidationFiltres = {}) {
  const { tenantId } = useTenant()
  return useQuery({
    queryKey: ['liquidations', tenantId, filtres],
    queryFn:  () => fetchLiquidations(filtres, tenantId!),
    enabled:  !!tenantId,
    staleTime: STALE_TIMES.DYNAMIC,
  })
}

export function useLiquidationsPaginated(filtres: LiquidationFiltres = {}, pageSize = 25) {
  const { tenantId } = useTenant()
  return useServerPagination({
    queryKey: ['liquidations-paginated', tenantId ?? '', JSON.stringify(filtres)],
    fetcher:  (page, size) => fetchLiquidationsPaginated(filtres, tenantId!, page, size),
    pageSize,
  })
}

export function useLiquidation(id: string) {
  const { tenantId } = useTenant()
  return useQuery({
    queryKey: ['liquidation', id, tenantId],
    queryFn:  () => fetchLiquidation(id, tenantId!),
    enabled:  !!tenantId && !!id,
    staleTime: STALE_TIMES.DYNAMIC,
  })
}

export function useLiquidationsByEngagement(engagementId: string) {
  const { tenantId } = useTenant()
  return useQuery({
    queryKey: ['liquidations-engagement', engagementId, tenantId],
    queryFn:  () => fetchLiquidationsByEngagement(engagementId, tenantId!),
    enabled:  !!tenantId && !!engagementId,
    staleTime: STALE_TIMES.DYNAMIC,
  })
}

export function useEngagementsVises() {
  const { tenantId } = useTenant()
  return useQuery({
    queryKey: ['engagements-vises', tenantId],
    queryFn:  () => fetchEngagementsVises(tenantId!),
    enabled:  !!tenantId,
    staleTime: STALE_TIMES.DYNAMIC,
  })
}

export function useCreerLiquidation() {
  const { tenantId } = useTenant()
  const { profil } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ input, statut }: { input: LiquidationInput; statut?: 'BROUILLON' | 'SOUMISE' }) =>
      createLiquidation(input, tenantId!, profil!.id, statut),
    onSuccess: (_, vars) => {
      INVALIDS.forEach((k) => qc.invalidateQueries({ queryKey: [k] }))
      qc.invalidateQueries({ queryKey: ['liquidations-paginated'] })
      toast.success(
        vars.statut === 'SOUMISE'
          ? 'Liquidation soumise pour validation.'
          : 'Liquidation enregistrée en brouillon.'
      )
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue'
      toast.error(`Erreur : ${msg}`)
    },
  })
}

export function useSoumettreeLiquidation() {
  const { tenantId } = useTenant()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => soumettreeLiquidation(id, tenantId!),
    onSuccess: () => {
      INVALIDS.forEach((k) => qc.invalidateQueries({ queryKey: [k] }))
      qc.invalidateQueries({ queryKey: ['liquidations-paginated'] })
      qc.invalidateQueries({ queryKey: ['liquidation'] })
      toast.success('Liquidation soumise pour validation.')
    },
    onError: () => toast.error('Impossible de soumettre la liquidation.'),
  })
}

export function useValiderLiquidation() {
  const { tenantId } = useTenant()
  const { profil } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => validerLiquidation(id, tenantId!, profil!.id),
    onSuccess: (_, id) => {
      INVALIDS.forEach((k) => qc.invalidateQueries({ queryKey: [k] }))
      qc.invalidateQueries({ queryKey: ['liquidations-paginated'] })
      qc.invalidateQueries({ queryKey: ['liquidation', id] })
      toast.success('Liquidation validée — engagement marqué LIQUIDÉ.')
    },
    onError: () => toast.error('Impossible de valider la liquidation.'),
  })
}

export function useRejeterLiquidation() {
  const { tenantId } = useTenant()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, motif }: { id: string; motif: string }) =>
      rejeterLiquidation(id, tenantId!, motif),
    onSuccess: () => {
      INVALIDS.forEach((k) => qc.invalidateQueries({ queryKey: [k] }))
      qc.invalidateQueries({ queryKey: ['liquidations-paginated'] })
      qc.invalidateQueries({ queryKey: ['liquidation'] })
      toast.success('Liquidation rejetée.')
    },
    onError: () => toast.error('Impossible de rejeter la liquidation.'),
  })
}

export function useAnnulerLiquidation() {
  const { tenantId } = useTenant()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => annulerLiquidation(id, tenantId!),
    onSuccess: () => {
      INVALIDS.forEach((k) => qc.invalidateQueries({ queryKey: [k] }))
      qc.invalidateQueries({ queryKey: ['liquidations-paginated'] })
      qc.invalidateQueries({ queryKey: ['liquidation'] })
      toast.success('Liquidation annulée.')
    },
    onError: () => toast.error('Impossible d\'annuler la liquidation.'),
  })
}

// Ré-export utilitaire pour les toasts avec montant
export { formatGNF }
