import { supabase } from '@/shared/lib/supabase'
import type { Notification } from '../types'

function mapNotification(row: Record<string, unknown>): Notification {
  return {
    id:         row.id as string,
    tenant_id:  row.tenant_id as string,
    user_id:    row.user_id as string,
    type:       row.type as Notification['type'],
    titre:      row.titre as string,
    message:    row.message as string,
    lu:         row.lu as boolean,
    priorite:   row.priorite as Notification['priorite'],
    lien:       row.lien as string | null,
    metadata:   (row.metadata as Record<string, unknown>) ?? {},
    created_at: row.created_at as string,
    lu_at:      row.lu_at as string | null,
  }
}

export async function fetchNotifications(
  userId: string,
  tenantId: string,
  limit = 50
): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => mapNotification(r as Record<string, unknown>))
}

export async function fetchNotificationsPaginated(
  userId: string,
  tenantId: string,
  page: number,
  perPage = 20
): Promise<{ data: Notification[]; count: number }> {
  const from = page * perPage
  const to   = from + perPage - 1

  const { data, error, count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) throw new Error(error.message)
  return {
    data:  (data ?? []).map((r) => mapNotification(r as Record<string, unknown>)),
    count: count ?? 0,
  }
}

export async function marquerLue(id: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ lu: true, lu_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw new Error(error.message)
}

export async function marquerToutesLues(userId: string, tenantId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ lu: true, lu_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)
    .eq('lu', false)

  if (error) throw new Error(error.message)
}
