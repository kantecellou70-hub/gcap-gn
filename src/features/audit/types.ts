export type AuditAction = 'INSERT' | 'UPDATE' | 'DELETE'

export type AuditTable =
  | 'engagements_depenses'
  | 'liquidations'
  | 'mandats_paiement'
  | 'recettes'
  | 'lignes_budgetaires'
  | 'user_profiles'
  | 'exercices_budgetaires'

export interface AuditLog {
  id: string
  tenantId: string | null
  userId: string | null
  userEmail: string | null
  action: AuditAction
  tableName: string
  recordId: string | null
  oldValues: Record<string, unknown> | null
  newValues: Record<string, unknown> | null
  createdAt: string
}

export interface AuditFiltres {
  search?: string
  tableName?: string
  dateDebut?: string
  dateFin?: string
  userId?: string
  page?: number
  pageSize?: number
}
