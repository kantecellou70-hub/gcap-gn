import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useTenant } from '@/app/contexts/TenantContext'
import { useAuth } from '@/app/contexts/AuthContext'
import {
  fetchLignesBudgetaires,
  fetchLigneBudgetaire,
  fetchExercices,
  createLigneBudgetaire,
  modifierCredit,
  fetchNomenclaturesForBudget,
} from '../api/budget-api'
import type { LigneBudgetaireInput, ModifCredit } from '../types'

const ROLES_BUDGET_WRITE = ['SUPER_ADMIN', 'ADMIN_MINISTERE', 'DAFF']

export function useLignesBudgetaires(exerciceId: string) {
  const { tenantId } = useTenant()

  return useQuery({
    queryKey: ['lignes-budgetaires', exerciceId, tenantId],
    queryFn:  () => fetchLignesBudgetaires(exerciceId, tenantId!),
    enabled:  !!tenantId && !!exerciceId,
  })
}

export function useLigneBudgetaire(id: string) {
  const { tenantId } = useTenant()

  return useQuery({
    queryKey: ['ligne-budgetaire', id, tenantId],
    queryFn:  () => fetchLigneBudgetaire(id, tenantId!),
    enabled:  !!tenantId && !!id,
  })
}

export function useExercices() {
  const { tenantId } = useTenant()

  return useQuery({
    queryKey: ['exercices', tenantId],
    queryFn:  () => fetchExercices(tenantId!),
    enabled:  !!tenantId,
  })
}

export function useMutationCreerLigneBudgetaire() {
  const { tenantId } = useTenant()
  const { profil } = useAuth()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (input: LigneBudgetaireInput) => {
      if (!profil?.roles.some((r) => ROLES_BUDGET_WRITE.includes(r))) {
        throw new Error('Permission refusée — rôle insuffisant')
      }
      return createLigneBudgetaire(input, tenantId!)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lignes-budgetaires'] })
      toast.success('Ligne budgétaire créée avec succès.')
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue'
      toast.error(`Erreur : ${msg}`)
    },
  })
}

export function useMutationModifierCredit() {
  const { tenantId } = useTenant()
  const { profil } = useAuth()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (params: ModifCredit) => {
      if (!profil?.roles.some((r) => ROLES_BUDGET_WRITE.includes(r))) {
        throw new Error('Permission refusée — rôle insuffisant')
      }
      return modifierCredit(params, tenantId!)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lignes-budgetaires'] })
      qc.invalidateQueries({ queryKey: ['engagements'] })
      toast.success('Crédit budgétaire modifié.')
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue'
      toast.error(`Modification impossible : ${msg}`)
    },
  })
}

export function useNomenclaturesForBudget() {
  const { tenantId } = useTenant()
  return useQuery({
    queryKey:  ['nomenclatures-budget', tenantId],
    queryFn:   () => fetchNomenclaturesForBudget(tenantId!),
    enabled:   !!tenantId,
    staleTime: 300_000,
  })
}
