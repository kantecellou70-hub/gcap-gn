import { cn } from '@/shared/lib/utils'
import type { StatutEngagement, StatutMandat } from '@/shared/types'

type StatutLiquidation = 'BROUILLON' | 'SOUMISE' | 'EN_COURS' | 'VALIDEE' | 'REJETEE' | 'ANNULEE'

const ENGAGEMENT_STYLES: Record<StatutEngagement, string> = {
  BROUILLON:       'bg-slate-100 text-slate-600',
  EN_ATTENTE_VISA: 'bg-amber-100 text-amber-700',
  VISE:            'bg-green-100 text-green-700',
  REJETE:          'bg-red-100 text-red-700',
  LIQUIDE:         'bg-blue-100 text-blue-700',
  ORDONNANCE:      'bg-indigo-100 text-indigo-700',
  ANNULE:          'bg-gray-100 text-gray-500',
}

const ENGAGEMENT_LABELS: Record<StatutEngagement, string> = {
  BROUILLON:       'Brouillon',
  EN_ATTENTE_VISA: 'En attente de visa',
  VISE:            'Visé',
  REJETE:          'Rejeté',
  LIQUIDE:         'Liquidé',
  ORDONNANCE:      'Ordonnancé',
  ANNULE:          'Annulé',
}

const MANDAT_STYLES: Record<StatutMandat, string> = {
  EMIS:            'bg-blue-100 text-blue-700',
  TRANSMIS_TRESOR: 'bg-amber-100 text-amber-700',
  PRIS_EN_CHARGE:  'bg-indigo-100 text-indigo-700',
  PAYE:            'bg-green-100 text-green-700',
  REJETE:          'bg-red-100 text-red-700',
  REJETE_TRESOR:   'bg-red-100 text-red-700',
  ANNULE:          'bg-slate-100 text-slate-500',
}

const MANDAT_LABELS: Record<StatutMandat, string> = {
  EMIS:            'Émis',
  TRANSMIS_TRESOR: 'Transmis Trésor',
  PRIS_EN_CHARGE:  'Pris en charge',
  PAYE:            'Payé',
  REJETE:          'Rejeté',
  REJETE_TRESOR:   'Rejeté Trésor',
  ANNULE:          'Annulé',
}

const LIQUIDATION_STYLES: Record<StatutLiquidation, string> = {
  BROUILLON: 'bg-slate-100 text-slate-600',
  SOUMISE:   'bg-blue-100 text-blue-700',
  EN_COURS:  'bg-amber-100 text-amber-700',
  VALIDEE:   'bg-green-100 text-green-700',
  REJETEE:   'bg-red-100 text-red-700',
  ANNULEE:   'bg-gray-100 text-gray-500',
}

const LIQUIDATION_LABELS: Record<StatutLiquidation, string> = {
  BROUILLON: 'Brouillon',
  SOUMISE:   'Soumise',
  EN_COURS:  'En cours',
  VALIDEE:   'Validée',
  REJETEE:   'Rejetée',
  ANNULEE:   'Annulée',
}

interface StatutBadgeProps {
  statut: StatutEngagement | StatutMandat | StatutLiquidation
  type?: 'engagement' | 'mandat' | 'liquidation'
}

export function StatutBadge({ statut, type = 'engagement' }: StatutBadgeProps) {
  let style: string
  let label: string

  if (type === 'mandat') {
    style = MANDAT_STYLES[statut as StatutMandat] ?? 'bg-gray-100 text-gray-500'
    label = MANDAT_LABELS[statut as StatutMandat] ?? statut
  } else if (type === 'liquidation') {
    style = LIQUIDATION_STYLES[statut as StatutLiquidation] ?? 'bg-gray-100 text-gray-500'
    label = LIQUIDATION_LABELS[statut as StatutLiquidation] ?? statut
  } else {
    style = ENGAGEMENT_STYLES[statut as StatutEngagement] ?? 'bg-gray-100 text-gray-500'
    label = ENGAGEMENT_LABELS[statut as StatutEngagement] ?? statut
  }

  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', style)}>
      {label}
    </span>
  )
}
