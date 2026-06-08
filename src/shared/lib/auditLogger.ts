import { supabase } from './supabase'
import { signAuditEntry } from './auditSignature'

export interface AuditEventParams {
  tenantId: string
  userId: string | null
  action: string
  tableName?: string
  recordId?: string
  oldValues?: Record<string, unknown>
  newValues?: Record<string, unknown>
  exerciceId?: string
}

export async function logAuditEvent(params: AuditEventParams): Promise<void> {
  try {
    const now = new Date().toISOString()
    const id = crypto.randomUUID()

    const signature = await signAuditEntry({
      id,
      tenantId: params.tenantId,
      userId: params.userId,
      action: params.action,
      createdAt: now,
    })

    const { error } = await supabase.from('audit_log').insert({
      id,
      tenant_id:   params.tenantId,
      user_id:     params.userId,
      action:      params.action,
      table_name:  params.tableName ?? null,
      record_id:   params.recordId ?? null,
      old_values:  params.oldValues ?? null,
      new_values:  params.newValues ?? null,
      exercice_id: params.exerciceId ?? null,
      signature:   signature || null,
      created_at:  now,
    })

    if (error) {
      console.error('[audit] Échec insert audit_log:', error.message)
    }
  } catch (err) {
    console.error('[audit] Erreur inattendue dans logAuditEvent:', err)
  }
}
