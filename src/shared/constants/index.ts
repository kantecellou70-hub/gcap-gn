export const APP_NAME = 'GCAP-GN'
export const APP_VERSION = '1.0.0'

export const USER_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN_TENANT: 'admin_tenant',
  ORDONNATEUR: 'ordonnateur',
  COMPTABLE: 'comptable',
  CONTROLEUR: 'controleur',
  AUDITEUR: 'auditeur',
  AGENT: 'agent',
} as const

export const MINISTRY_TYPES = {
  MINISTERE: 'ministere',
  DAFF: 'daff',
  SAFF: 'saff',
  EPA: 'epa',
} as const

export const EXPENSE_CYCLE_STATUSES = {
  ENGAGEMENT: 'engagement',
  LIQUIDATION: 'liquidation',
  ORDONNANCEMENT: 'ordonnancement',
  PAIEMENT: 'paiement',
} as const

export const QUERY_KEYS = {
  BUDGET: 'budget',
  ENGAGEMENTS: 'engagements',
  LIQUIDATIONS: 'liquidations',
  ORDONNANCEMENT: 'ordonnancement',
  RECETTES: 'recettes',
  MATIERES: 'matieres',
  COMPTES_ADMIN: 'comptes-admin',
  REPORTING: 'reporting',
  USERS: 'users',
} as const
