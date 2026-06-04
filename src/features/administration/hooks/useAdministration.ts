import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useTenant } from '@/app/contexts/TenantContext'
import {
  fetchUtilisateurs, inviterUtilisateur, modifierRoleUtilisateur,
  desactiverUtilisateur, reactiverUtilisateur,
  fetchExercicesAdmin, updateStatutExercice, createExercice,
  fetchFournisseurs, createFournisseur, updateFournisseur,
  fetchNomenclatures,
} from '../api/administration-api'
import type { InviteInput, FournisseurInput, Role, ExerciceBudgetaire } from '../types'

// ─── Utilisateurs ────────────────────────────────────────────────────────────

export function useUtilisateurs() {
  const { tenantId } = useTenant()
  return useQuery({
    queryKey: ['utilisateurs', tenantId],
    queryFn:  () => fetchUtilisateurs(tenantId!),
    enabled:  !!tenantId,
  })
}

export function useInviterUtilisateur() {
  const { tenantId } = useTenant()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: InviteInput) => inviterUtilisateur(input, tenantId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['utilisateurs'] })
      toast.success('Utilisateur créé avec succès.')
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue'
      toast.error(`Erreur invitation : ${msg}`)
    },
  })
}

export function useModifierRole() {
  const { tenantId } = useTenant()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: Role }) =>
      modifierRoleUtilisateur(userId, tenantId!, role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['utilisateurs'] })
      toast.success('Rôle mis à jour.')
    },
    onError: () => toast.error('Impossible de modifier le rôle.'),
  })
}

export function useDesactiverUtilisateur() {
  const { tenantId } = useTenant()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => desactiverUtilisateur(userId, tenantId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['utilisateurs'] })
      toast.success('Utilisateur désactivé.')
    },
    onError: () => toast.error('Impossible de désactiver l\'utilisateur.'),
  })
}

export function useReactiverUtilisateur() {
  const { tenantId } = useTenant()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => reactiverUtilisateur(userId, tenantId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['utilisateurs'] })
      toast.success('Utilisateur réactivé.')
    },
    onError: () => toast.error('Impossible de réactiver l\'utilisateur.'),
  })
}

// ─── Exercices ────────────────────────────────────────────────────────────────

export function useExercicesAdmin() {
  const { tenantId } = useTenant()
  return useQuery({
    queryKey: ['exercices-admin', tenantId],
    queryFn:  () => fetchExercicesAdmin(tenantId!),
    enabled:  !!tenantId,
  })
}

export function useUpdateStatutExercice() {
  const { tenantId } = useTenant()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, statut }: { id: string; statut: ExerciceBudgetaire['statut'] }) =>
      updateStatutExercice(id, statut, tenantId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exercices-admin'] })
      qc.invalidateQueries({ queryKey: ['exercices'] })
      toast.success('Statut de l\'exercice mis à jour.')
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Erreur'
      toast.error(`Impossible : ${msg}`)
    },
  })
}

export function useCreerExercice() {
  const { tenantId } = useTenant()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (annee: number) => createExercice(annee, tenantId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exercices-admin'] })
      qc.invalidateQueries({ queryKey: ['exercices'] })
      toast.success('Exercice budgétaire créé.')
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Erreur'
      toast.error(`Erreur : ${msg}`)
    },
  })
}

// ─── Fournisseurs ─────────────────────────────────────────────────────────────

export function useFournisseurs() {
  const { tenantId } = useTenant()
  return useQuery({
    queryKey: ['fournisseurs', tenantId],
    queryFn:  () => fetchFournisseurs(tenantId!),
    enabled:  !!tenantId,
    staleTime: 60_000,
  })
}

export function useCreerFournisseur() {
  const { tenantId } = useTenant()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: FournisseurInput) => createFournisseur(input, tenantId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fournisseurs'] })
      toast.success('Fournisseur créé.')
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Erreur'
      toast.error(`Erreur : ${msg}`)
    },
  })
}

export function useModifierFournisseur() {
  const { tenantId } = useTenant()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: FournisseurInput }) =>
      updateFournisseur(id, input, tenantId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fournisseurs'] })
      toast.success('Fournisseur mis à jour.')
    },
    onError: () => toast.error('Impossible de modifier le fournisseur.'),
  })
}

// ─── Nomenclatures ───────────────────────────────────────────────────────────

export function useNomenclatures() {
  const { tenantId } = useTenant()
  return useQuery({
    queryKey:  ['nomenclatures', tenantId],
    queryFn:   () => fetchNomenclatures(tenantId!),
    enabled:   !!tenantId,
    staleTime: 300_000,
  })
}
