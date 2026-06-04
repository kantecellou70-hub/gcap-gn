import { supabase } from '@/shared/lib/supabase'
import type { AuditLog, AuditFiltres } from '../types'

const PAGE_SIZE_DEFAULT = 25

function mapRow(row: Record<string, unknown>): AuditLog {
  return {
    id:         row.id as string,
    tenantId:   row.tenant_id as string | null,
    userId:     row.user_id as string | null,
    userEmail:  row.user_email as string | null,
    action:     row.action as AuditLog['action'],
    tableName:  row.table_name as string,
    recordId:   row.record_id as string | null,
    oldValues:  (row.old_values as Record<string, unknown> | null) ?? null,
    newValues:  (row.new_values as Record<string, unknown> | null) ?? null,
    createdAt:  row.created_at as string,
  }
}

export async function fetchAuditLogs(
  filtres: AuditFiltres,
  tenantId: string
): Promise<{ data: AuditLog[]; count: number }> {
  const page     = filtres.page     ?? 1
  const pageSize = filtres.pageSize ?? PAGE_SIZE_DEFAULT
  const from     = (page - 1) * pageSize
  const to       = from + pageSize - 1

  let query = supabase
    .from('audit_log')
    .select('*', { count: 'exact' })
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (filtres.tableName) {
    query = query.eq('table_name', filtres.tableName)
  }
  if (filtres.userId) {
    query = query.eq('user_id', filtres.userId)
  }
  if (filtres.dateDebut) {
    query = query.gte('created_at', filtres.dateDebut)
  }
  if (filtres.dateFin) {
    // inclure toute la journée de fin
    query = query.lte('created_at', `${filtres.dateFin}T23:59:59`)
  }
  if (filtres.search) {
    query = query.or(
      `user_email.ilike.%${filtres.search}%,record_id.ilike.%${filtres.search}%`
    )
  }

  const { data, error, count } = await query

  if (error) throw new Error(error.message)

  return {
    data:  (data as Record<string, unknown>[]).map(mapRow),
    count: count ?? 0,
  }
}

export async function fetchAuditUsers(tenantId: string): Promise<{ id: string; email: string }[]> {
  const { data, error } = await supabase
    .from('audit_log')
    .select('user_id, user_email')
    .eq('tenant_id', tenantId)
    .not('user_id', 'is', null)
    .order('user_email')

  if (error) throw new Error(error.message)

  const seen = new Set<string>()
  const users: { id: string; email: string }[] = []
  for (const row of (data ?? []) as { user_id: string; user_email: string }[]) {
    if (row.user_id && !seen.has(row.user_id)) {
      seen.add(row.user_id)
      users.push({ id: row.user_id, email: row.user_email ?? row.user_id })
    }
  }
  return users
}
