import type { TypeRecette, StatutRecette } from './types'

export const TYPE_RECETTE_LABELS: Record<TypeRecette, string> = {
  REDEVANCE:     'Redevance',
  VENTE_SERVICE: 'Vente de service',
  REMBOURSEMENT: 'Remboursement',
  DON:           'Don / Subvention',
  AUTRE:         'Autre',
}

export const TYPE_RECETTE_COLORS: Record<TypeRecette, string> = {
  REDEVANCE:     'bg-blue-100 text-blue-700',
  VENTE_SERVICE: 'bg-teal-100 text-teal-700',
  REMBOURSEMENT: 'bg-purple-100 text-purple-700',
  DON:           'bg-pink-100 text-pink-700',
  AUTRE:         'bg-slate-100 text-slate-600',
}

export const STATUT_RECETTE_LABELS: Record<StatutRecette, string> = {
  PREVUE:    'Prévue',
  CONSTATEE: 'Constatée',
  RECOUVREE: 'Recouvrée',
  ANNULEE:   'Annulée',
}

export const STATUT_RECETTE_COLORS: Record<StatutRecette, string> = {
  PREVUE:    'bg-blue-100 text-blue-700',
  CONSTATEE: 'bg-amber-100 text-amber-700',
  RECOUVREE: 'bg-green-100 text-green-700',
  ANNULEE:   'bg-slate-100 text-slate-500',
}

export const TYPES_RECETTE_OPTIONS = [
  { value: 'REDEVANCE',     label: 'Redevance' },
  { value: 'VENTE_SERVICE', label: 'Vente de service' },
  { value: 'REMBOURSEMENT', label: 'Remboursement' },
  { value: 'DON',           label: 'Don / Subvention' },
  { value: 'AUTRE',         label: 'Autre' },
] as const

export const ROLES_RECETTE_CREATE   = ['SUPER_ADMIN', 'DAFF', 'SAFF', 'COMPTABLE_MATIERES']
export const ROLES_RECETTE_VALIDATE = ['SUPER_ADMIN', 'ORDONNATEUR', 'DAFF']
