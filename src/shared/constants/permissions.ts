export const PERMISSIONS = {
  ENGAGEMENT_CREATE:    'engagement.create',
  ENGAGEMENT_VALIDATE:  'engagement.validate',
  ENGAGEMENT_VISA:      'engagement.visa',
  ENGAGEMENT_REJECT:    'engagement.reject',
  LIQUIDATION_CREATE:   'liquidation.create',
  LIQUIDATION_VALIDATE: 'liquidation.validate',
  MANDAT_EMIT:          'mandat.emit',
  BUDGET_MODIFY:        'budget.modify',
  USERS_MANAGE:         'users.manage',
} as const

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS]
