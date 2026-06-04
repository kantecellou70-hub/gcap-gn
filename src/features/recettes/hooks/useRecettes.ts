import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useTenant } from '@/app/contexts/TenantContext'
import { useAuth } from '@/app/contexts/AuthContext'
import {
  fetchRecettes,
  fetchRecette,
  createRecette,
  constaterRecette,
  recouvrerRecette,
  annulerRecette,
} from '../api/recettes-api'
import type { RecetteFiltres, RecetteInput } from '../types'

const INVALIDS = ['recettes']

export function useRecettes(filtres: RecetteFiltres = {}) {
  const { tenantId } = useTenant()
  return useQuery({
    queryKey: ['recettes', tenantId, filtres],
    queryFn:  () => fetchRecettes(filtres, tenantId!),
    enabled:  !!tenantId,
    staleTime: 30_000,
  })
}

export function useRecette(id: string) {
  const { tenantId } = useTenant()
  return useQuery({
    queryKey: ['recette', id, tenantId],
    queryFn:  () => fetchRecette(id, tenantId!),
    enabled:  !!tenantId && !!id,
  })
}

export function useCreerRecette() {
  const { tenantId } = useTenant()
  const { profil } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: RecetteInput) =>
      createRecette(input, tenantId!, profil!.id),
    onSuccess: () => {
      INVALIDS.forEach((k) => qc.invalidateQueries({ queryKey: [k] }))
      toast.success('Recette créée avec succès.')
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue'
      toast.error(`Erreur : ${msg}`)
    },
  })
}

export function useConstaterRecette() {
  const { tenantId } = useTenant()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, montant, date }: { id: string; montant: number; date: string }) =>
      constaterRecette(id, tenantId!, montant, date),
    onSuccess: () => {
      INVALIDS.forEach((k) => qc.invalidateQueries({ queryKey: [k] }))
      qc.invalidateQueries({ queryKey: ['recette'] })
      toast.success('Recette constatée.')
    },
    onError: () => toast.error('Impossible de constater la recette.'),
  })
}

export function useRecouvrerRecette() {
  const { tenantId } = useTenant()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, montant }: { id: string; montant: number }) =>
      recouvrerRecette(id, tenantId!, montant),
    onSuccess: () => {
      INVALIDS.forEach((k) => qc.invalidateQueries({ queryKey: [k] }))
      qc.invalidateQueries({ queryKey: ['recette'] })
      toast.success('Recouvrement enregistré.')
    },
    onError: () => toast.error('Impossible d\'enregistrer le recouvrement.'),
  })
}

export function useAnnulerRecette() {
  const { tenantId } = useTenant()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => annulerRecette(id, tenantId!),
    onSuccess: () => {
      INVALIDS.forEach((k) => qc.invalidateQueries({ queryKey: [k] }))
      qc.invalidateQueries({ queryKey: ['recette'] })
      toast.success('Recette annulée.')
    },
    onError: () => toast.error('Impossible d\'annuler la recette.'),
  })
}
