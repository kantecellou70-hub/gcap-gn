import type { StatutMandat } from '@/shared/types'

export const STATUT_MANDAT_LABELS: Record<StatutMandat, string> = {
  EMIS:            'Émis',
  TRANSMIS_TRESOR: 'Transmis Trésor',
  PRIS_EN_CHARGE:  'Pris en charge',
  PAYE:            'Payé',
  REJETE:          'Rejeté',
  REJETE_TRESOR:   'Rejeté par le Trésor',
  ANNULE:          'Annulé',
}

export const MODES_PAIEMENT = [
  { value: 'VIREMENT_BANCAIRE', label: 'Virement bancaire' },
  { value: 'VIREMENT',          label: 'Virement' },
  { value: 'CHEQUE_TRESOR',     label: 'Chèque Trésor' },
  { value: 'CHEQUE',            label: 'Chèque' },
  { value: 'CAISSE',            label: 'Caisse' },
  { value: 'MOBILE_MONEY',      label: 'Mobile Money' },
] as const

export const ROLES_MANDAT_EMIT     = ['SUPER_ADMIN', 'ORDONNATEUR', 'DAFF']
export const ROLES_MANDAT_TRANSMIT = ['SUPER_ADMIN', 'ORDONNATEUR', 'DAFF']
export const ROLES_MANDAT_PAY      = ['SUPER_ADMIN', 'DAFF', 'COMPTABLE_MATIERES']
