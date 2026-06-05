import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useTenant } from '@/app/contexts/TenantContext'
import { useAuth } from '@/app/contexts/AuthContext'
import {
  fetchEngagements,
  fetchEngagement,
  fetchEngagementsEnAttenteVisa,
  createEngagement,
  updateStatutEngagement,
  visaEngagement,
  uploadPieceJointe,
  supprimerPieceJointe,
} from '../api/engagements-api'
import type { EngagementFiltres, EngagementInput, VisaInput } from '../types'

export function useEngagements(filtres: EngagementFiltres = {}) {
  const { tenantId } = useTenant()
  return useQuery({
    queryKey: ['engagements', tenantId, filtres],
    queryFn:  () => fetchEngagements(filtres, tenantId!),
    enabled:  !!tenantId,
  })
}

export function useEngagement(id: string) {
  const { tenantId } = useTenant()
  return useQuery({
    queryKey: ['engagement', id, tenantId],
    queryFn:  () => fetchEngagement(id, tenantId!),
    enabled:  !!tenantId && !!id,
  })
}

export function useEngagementsEnAttenteVisa() {
  const { tenantId } = useTenant()
  return useQuery({
    queryKey: ['engagements-attente-visa', tenantId],
    queryFn:  () => fetchEngagementsEnAttenteVisa(tenantId!),
    enabled:  !!tenantId,
  })
}

export function useCreerEngagement() {
  const { tenantId } = useTenant()
  const { profil } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ input, statut }: { input: EngagementInput; statut?: 'BROUILLON' | 'EN_ATTENTE_VISA' }) =>
      createEngagement(input, tenantId!, profil!.id, statut),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['engagements'] })
      qc.invalidateQueries({ queryKey: ['lignes-budgetaires'] })
      toast.success(
        vars.statut === 'EN_ATTENTE_VISA'
          ? 'Engagement soumis au Contrôleur Financier.'
          : 'Engagement enregistré en brouillon.'
      )
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue'
      toast.error(`Erreur lors de la création : ${msg}`)
    },
  })
}

export function useSoumettreEngagement() {
  const { tenantId } = useTenant()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      updateStatutEngagement(id, 'EN_ATTENTE_VISA', tenantId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['engagements'] })
      qc.invalidateQueries({ queryKey: ['engagement'] })
      toast.success('Engagement soumis au Contrôleur Financier.')
    },
    onError: () => toast.error('Impossible de soumettre l\'engagement.'),
  })
}

export function useViserEngagement() {
  const { tenantId } = useTenant()
  const { profil } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: VisaInput) =>
      visaEngagement(input, tenantId!, profil!.id),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['engagements'] })
      qc.invalidateQueries({ queryKey: ['engagement'] })
      qc.invalidateQueries({ queryKey: ['engagements-attente-visa'] })
      qc.invalidateQueries({ queryKey: ['lignes-budgetaires'] })
      toast.success(
        vars.decision === 'VISE'
          ? 'Visa apposé avec succès.'
          : 'Engagement rejeté. Le créateur en sera informé.'
      )
    },
    onError: () => toast.error('Erreur lors de l\'enregistrement du visa.'),
  })
}

export function useAnnulerEngagement() {
  const { tenantId } = useTenant()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, motif }: { id: string; motif: string }) =>
      updateStatutEngagement(id, 'ANNULE', tenantId!, { motifRejet: motif }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['engagements'] })
      qc.invalidateQueries({ queryKey: ['engagement'] })
      qc.invalidateQueries({ queryKey: ['lignes-budgetaires'] })
      toast.success('Engagement annulé.')
    },
    onError: () => toast.error('Impossible d\'annuler l\'engagement.'),
  })
}

export function useUploadPieceJointe() {
  const { tenantId } = useTenant()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ engagementId, file, piecesActuelles }: {
      engagementId: string
      file: File
      piecesActuelles: { nom: string; url: string; taille: number; type: string; uploadedAt: string }[]
    }) => uploadPieceJointe(engagementId, tenantId!, file, piecesActuelles),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['engagement', vars.engagementId] })
      toast.success('Pièce jointe ajoutée.')
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue'
      toast.error(`Échec upload : ${msg}`)
    },
  })
}

export function useSupprimerPieceJointe() {
  const { tenantId } = useTenant()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ engagementId, pieceUrl, piecesActuelles }: {
      engagementId: string
      pieceUrl: string
      piecesActuelles: { nom: string; url: string; taille: number; type: string; uploadedAt: string }[]
    }) => supprimerPieceJointe(engagementId, tenantId!, pieceUrl, piecesActuelles),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['engagement', vars.engagementId] })
      toast.success('Pièce jointe supprimée.')
    },
    onError: () => toast.error('Impossible de supprimer la pièce jointe.'),
  })
}
