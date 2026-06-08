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
  action: string
  tableName: string
  recordId: string | null
  oldValues: Record<string, unknown> | null
  newValues: Record<string, unknown> | null
  createdAt: string
  signature: string | null
  exerciceId: string | null
  userNom?: string
  userPrenom?: string
  ipAddress?: string | null
}

// Alias for new code — same shape, same camelCase convention
export type AuditEntry = AuditLog

export interface AuditFiltres {
  search?: string
  action?: string
  tableName?: string
  dateDebut?: string
  dateFin?: string
  userId?: string
  exerciceId?: string
  page?: number
  pageSize?: number
}
