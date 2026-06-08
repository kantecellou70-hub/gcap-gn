import { supabase } from '@/shared/lib/supabase'
import type { AuditLog, AuditFiltres } from '../types'

const PAGE_SIZE_DEFAULT = 50

function mapRow(row: Record<string, unknown>): AuditLog {
  return {
    id:          row.id as string,
    tenantId:    row.tenant_id as string | null,
    userId:      row.user_id as string | null,
    userEmail:   row.user_email as string | null,
    action:      row.action as string,
    tableName:   row.table_name as string,
    recordId:    row.record_id as string | null,
    oldValues:   (row.old_values as Record<string, unknown> | null) ?? null,
    newValues:   (row.new_values as Record<string, unknown> | null) ?? null,
    createdAt:   row.created_at as string,
    signature:   row.signature as string | null,
    exerciceId:  row.exercice_id as string | null,
    ipAddress:   row.ip_address as string | null,
  }
}

function applyFilters(
  query: ReturnType<typeof supabase.from>,
  filtres: AuditFiltres
) {
  let q = query
  if (filtres.action)     q = q.eq('action', filtres.action)
  if (filtres.tableName)  q = q.eq('table_name', filtres.tableName)
  if (filtres.userId)     q = q.eq('user_id', filtres.userId)
  if (filtres.exerciceId) q = q.eq('exercice_id', filtres.exerciceId)
  if (filtres.dateDebut)  q = q.gte('created_at', filtres.dateDebut)
  if (filtres.dateFin)    q = q.lte('created_at', `${filtres.dateFin}T23:59:59`)
  if (filtres.search) {
    q = q.or(
      `user_email.ilike.%${filtres.search}%,record_id.ilike.%${filtres.search}%`
    )
  }
  return q
}

export async function fetchAuditLogs(
  filtres: AuditFiltres,
  tenantId: string
): Promise<{ data: AuditLog[]; count: number }> {
  const page     = filtres.page     ?? 1
  const pageSize = filtres.pageSize ?? PAGE_SIZE_DEFAULT
  const from     = (page - 1) * pageSize
  const to       = from + pageSize - 1

  const base = supabase
    .from('audit_log')
    .select('*', { count: 'exact' })
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .range(from, to)

  const { data, error, count } = await applyFilters(base, filtres)

  if (error) throw new Error(error.message)

  return {
    data:  (data as Record<string, unknown>[]).map(mapRow),
    count: count ?? 0,
  }
}

export async function fetchAuditForExport(
  tenantId: string,
  filtres: AuditFiltres
): Promise<AuditLog[]> {
  const base = supabase
    .from('audit_log')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(10_000)

  const { data, error } = await applyFilters(base, filtres)

  if (error) throw new Error(error.message)

  return (data as Record<string, unknown>[]).map(mapRow)
}

export async function fetchAuditActions(tenantId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('audit_log')
    .select('action')
    .eq('tenant_id', tenantId)
    .order('action')

  if (error) throw new Error(error.message)

  const seen = new Set<string>()
  for (const row of (data ?? []) as { action: string }[]) {
    seen.add(row.action)
  }
  return Array.from(seen).sort()
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
