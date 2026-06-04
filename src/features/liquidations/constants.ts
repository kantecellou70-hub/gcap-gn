import type { StatutLiquidation } from './types'

export const STATUT_LIQUIDATION_LABELS: Record<StatutLiquidation, string> = {
  BROUILLON: 'Brouillon',
  SOUMISE:   'Soumise',
  VALIDEE:   'Validée',
  REJETEE:   'Rejetée',
  ANNULEE:   'Annulée',
}

export const STATUT_LIQUIDATION_COLORS: Record<StatutLiquidation, string> = {
  BROUILLON: 'bg-slate-100 text-slate-600',
  SOUMISE:   'bg-blue-100 text-blue-700',
  VALIDEE:   'bg-green-100 text-green-700',
  REJETEE:   'bg-red-100 text-red-700',
  ANNULEE:   'bg-gray-100 text-gray-500',
}

export const ROLES_LIQUIDATION_CREATE   = ['SUPER_ADMIN', 'DAFF', 'SAFF']
export const ROLES_LIQUIDATION_VALIDATE = ['SUPER_ADMIN', 'ORDONNATEUR', 'DAFF']
