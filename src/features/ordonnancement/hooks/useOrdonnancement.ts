import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useTenant } from '@/app/contexts/TenantContext'
import { useAuth } from '@/app/contexts/AuthContext'
import { useServerPagination } from '@/shared/hooks/useServerPagination'
import { STALE_TIMES } from '@/shared/lib/queryClient'
import {
  fetchMandats,
  fetchMandat,
  fetchLiquidationsValidees,
  fetchMandatsPaginated,
  emettreMandatPaiement,
  transmettreAuTresor,
  enregistrerPaiement,
  rejeterParTresor,
  annulerMandat,
} from '../api/ordonnancement-api'
import type { MandatFiltres, MandatInput, EnregistrerPaiementInput } from '../types'

const INVALIDS = ['mandats', 'liquidations-validees', 'engagements', 'lignes-budgetaires']

export function useMandats(filtres: MandatFiltres = {}) {
  const { tenantId } = useTenant()
  return useQuery({
    queryKey: ['mandats', tenantId, filtres],
    queryFn:  () => fetchMandats(filtres, tenantId!),
    enabled:  !!tenantId,
    staleTime: STALE_TIMES.DYNAMIC,
  })
}

export function useMandatsPaginated(filtres: MandatFiltres = {}, pageSize = 25) {
  const { tenantId } = useTenant()
  return useServerPagination({
    queryKey: ['mandats-paginated', tenantId ?? '', JSON.stringify(filtres)],
    fetcher:  (page, size) => fetchMandatsPaginated(filtres, tenantId!, page, size),
    pageSize,
  })
}

export function useMandat(id: string) {
  const { tenantId } = useTenant()
  return useQuery({
    queryKey: ['mandat', id, tenantId],
    queryFn:  () => fetchMandat(id, tenantId!),
    enabled:  !!tenantId && !!id,
    staleTime: STALE_TIMES.DYNAMIC,
  })
}

export function useLiquidationsValidees() {
  const { tenantId } = useTenant()
  return useQuery({
    queryKey: ['liquidations-validees', tenantId],
    queryFn:  () => fetchLiquidationsValidees(tenantId!),
    enabled:  !!tenantId,
    staleTime: STALE_TIMES.DYNAMIC,
  })
}

export function useEmettreMandat() {
  const { tenantId } = useTenant()
  const { profil } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: MandatInput) =>
      emettreMandatPaiement(input, tenantId!, profil!.id),
    onSuccess: () => {
      INVALIDS.forEach((k) => qc.invalidateQueries({ queryKey: [k] }))
      qc.invalidateQueries({ queryKey: ['mandats-paginated'] })
      toast.success('Mandat de paiement émis.')
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue'
      toast.error(`Erreur : ${msg}`)
    },
  })
}

export function useTransmettreAuTresor() {
  const { tenantId } = useTenant()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => transmettreAuTresor(id, tenantId!),
    onSuccess: (_, id) => {
      INVALIDS.forEach((k) => qc.invalidateQueries({ queryKey: [k] }))
      qc.invalidateQueries({ queryKey: ['mandats-paginated'] })
      qc.invalidateQueries({ queryKey: ['mandat', id] })
      toast.success('Mandat transmis au Trésor.')
    },
    onError: () => toast.error('Impossible de transmettre le mandat.'),
  })
}

export function useEnregistrerPaiement() {
  const { tenantId } = useTenant()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: EnregistrerPaiementInput }) =>
      enregistrerPaiement(id, tenantId!, input),
    onSuccess: (_, vars) => {
      INVALIDS.forEach((k) => qc.invalidateQueries({ queryKey: [k] }))
      qc.invalidateQueries({ queryKey: ['mandats-paginated'] })
      qc.invalidateQueries({ queryKey: ['mandat', vars.id] })
      toast.success('Paiement enregistré.')
    },
    onError: () => toast.error('Impossible d\'enregistrer le paiement.'),
  })
}

export function useRejeterParTresor() {
  const { tenantId } = useTenant()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, motif }: { id: string; motif: string }) =>
      rejeterParTresor(id, tenantId!, motif),
    onSuccess: (_, vars) => {
      INVALIDS.forEach((k) => qc.invalidateQueries({ queryKey: [k] }))
      qc.invalidateQueries({ queryKey: ['mandats-paginated'] })
      qc.invalidateQueries({ queryKey: ['mandat', vars.id] })
      toast.success('Rejet Trésor enregistré.')
    },
    onError: () => toast.error('Impossible d\'enregistrer le rejet.'),
  })
}

export function useAnnulerMandat() {
  const { tenantId } = useTenant()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => annulerMandat(id, tenantId!),
    onSuccess: (_, id) => {
      INVALIDS.forEach((k) => qc.invalidateQueries({ queryKey: [k] }))
      qc.invalidateQueries({ queryKey: ['mandats-paginated'] })
      qc.invalidateQueries({ queryKey: ['mandat', id] })
      toast.success('Mandat annulé.')
    },
    onError: () => toast.error('Impossible d\'annuler le mandat.'),
  })
}
