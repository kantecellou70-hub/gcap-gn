export const PERMISSIONS = {
  ENGAGEMENT_CREATE:       'engagement.create',
  ENGAGEMENT_VALIDATE:     'engagement.validate',
  ENGAGEMENT_VISA:         'engagement.visa',
  ENGAGEMENT_REJECT:       'engagement.reject',
  LIQUIDATION_CREATE:      'liquidation.create',
  LIQUIDATION_VALIDATE:    'liquidation.validate',
  MANDAT_EMIT:             'mandat.emit',
  BUDGET_MODIFY:           'budget.modify',
  USERS_MANAGE:            'users.manage',
  AUDIT_CONSULTER:         'audit.consulter',
  MATIERES_GERER:          'matieres.gerer',
  MATIERES_VALIDER:        'matieres.valider',
  INVENTAIRE_CLORE:        'inventaire.clore',
  CONSOLIDATION_NATIONALE: 'consolidation.nationale',
} as const

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS]

import type { Role } from '@/shared/types'

// Rôles pour lesquels le MFA TOTP est obligatoire (V1)
export const MFA_REQUIRED_ROLES: Role[] = ['SUPER_ADMIN', 'ORDONNATEUR', 'CF']

export function isMfaRequired(role: Role): boolean {
  return MFA_REQUIRED_ROLES.includes(role)
}
