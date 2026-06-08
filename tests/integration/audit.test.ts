import { describe, it, expect, vi, beforeEach } from 'vitest'
import { supabase } from '@/shared/lib/supabase'
import { logAuditEvent } from '@/shared/lib/auditLogger'
import { signAuditEntry, verifyAuditSignature } from '@/shared/lib/auditSignature'
import { fetchAuditLogs } from '@/features/audit/api/audit-api'
import { canDo } from '@/shared/lib/utils'
import { PERMISSIONS } from '@/shared/constants/permissions'

const TENANT_ID = 'tenant-audit-0000-0000-000000000001'
const USER_ID   = 'user-audit-0000-0000-000000000001'
const SECRET    = 'a3f8c2e1d94b7056f1820e3c49a6b7d8e5f2c1a0b9d4e7f3c2a1b0d9e8f7c6a5'

const BASE_ENTRY = {
  id:        'audit-entry-0001',
  tenantId:  TENANT_ID,
  userId:    USER_ID,
  action:    'engagement.visa.cf',
  createdAt: '2026-01-15T10:30:00.000Z',
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── logAuditEvent ────────────────────────────────────────────────────────────

describe('logAuditEvent', () => {
  it('insère dans audit_log via Supabase', async () => {
    await logAuditEvent({
      tenantId: TENANT_ID,
      userId:   USER_ID,
      action:   'engagement.create',
      tableName: 'engagements_depenses',
      recordId:  'eng-0001',
    })

    expect(vi.mocked(supabase.from)).toHaveBeenCalledWith('audit_log')
    expect(vi.mocked(supabase.from('audit_log').insert)).toHaveBeenCalledWith(
      expect.objectContaining({
        tenant_id: TENANT_ID,
        user_id:   USER_ID,
        action:    'engagement.create',
        table_name: 'engagements_depenses',
        record_id:  'eng-0001',
      })
    )
  })

  it('ne lève pas d\'exception si Supabase retourne une erreur', async () => {
    // logAuditEvent swallow intentionnellement les erreurs Supabase
    await expect(
      logAuditEvent({ tenantId: TENANT_ID, userId: USER_ID, action: 'test.action' })
    ).resolves.not.toThrow()
  })

  it('inclut un champ signature dans le payload', async () => {
    await logAuditEvent({
      tenantId: TENANT_ID,
      userId:   USER_ID,
      action:   'mandat.emis',
    })

    const insertArg = vi.mocked(supabase.from('audit_log').insert).mock.calls[0]?.[0] as Record<string, unknown>
    expect(insertArg).toHaveProperty('signature')
  })
})

// ─── signAuditEntry / verifyAuditSignature ────────────────────────────────────

describe('signAuditEntry', () => {
  it('produit une signature hex de 64 caractères', async () => {
    const sig = await signAuditEntry(BASE_ENTRY, SECRET)
    expect(sig).toHaveLength(64)
    expect(sig).toMatch(/^[0-9a-f]{64}$/)
  })

  it('est déterministe — même entrée produit toujours la même signature', async () => {
    const sig1 = await signAuditEntry(BASE_ENTRY, SECRET)
    const sig2 = await signAuditEntry(BASE_ENTRY, SECRET)
    expect(sig1).toBe(sig2)
  })

  it('retourne une chaîne vide si le secret est absent', async () => {
    const sig = await signAuditEntry(BASE_ENTRY, '')
    expect(sig).toBe('')
  })

  it('produit une signature différente si l\'action change', async () => {
    const sig1 = await signAuditEntry(BASE_ENTRY, SECRET)
    const sig2 = await signAuditEntry({ ...BASE_ENTRY, action: 'mandat.emis' }, SECRET)
    expect(sig1).not.toBe(sig2)
  })

  it("traite userId null comme 'system' dans le payload", async () => {
    const withNull   = await signAuditEntry({ ...BASE_ENTRY, userId: null }, SECRET)
    const withSystem = await signAuditEntry({ ...BASE_ENTRY, userId: 'system' }, SECRET)
    expect(withNull).not.toBe('')
    expect(withNull).toBe(withSystem)
  })
})

describe('verifyAuditSignature', () => {
  it('retourne true pour une signature valide', async () => {
    const sig = await signAuditEntry(BASE_ENTRY, SECRET)
    const ok  = await verifyAuditSignature({ ...BASE_ENTRY, signature: sig }, SECRET)
    expect(ok).toBe(true)
  })

  it('retourne false si la signature est nulle', async () => {
    const ok = await verifyAuditSignature({ ...BASE_ENTRY, signature: null }, SECRET)
    expect(ok).toBe(false)
  })

  it('retourne false si le payload est altéré', async () => {
    const sig = await signAuditEntry(BASE_ENTRY, SECRET)
    const ok  = await verifyAuditSignature(
      { ...BASE_ENTRY, action: 'engagement.delete', signature: sig },
      SECRET
    )
    expect(ok).toBe(false)
  })

  it('retourne false si la signature est corrompue', async () => {
    const ok = await verifyAuditSignature(
      { ...BASE_ENTRY, signature: 'cafebabe000000000000000000000000cafebabe000000000000000000000000' },
      SECRET
    )
    expect(ok).toBe(false)
  })
})

// ─── Droits d'accès audit (AUDIT_CONSULTER) ───────────────────────────────────

describe('Droits d\'accès audit', () => {
  it('AUDITEUR peut consulter le journal d\'audit', () => {
    expect(canDo(PERMISSIONS.AUDIT_CONSULTER, ['AUDITEUR'])).toBe(true)
  })

  it('CF peut consulter le journal d\'audit', () => {
    expect(canDo(PERMISSIONS.AUDIT_CONSULTER, ['CF'])).toBe(true)
  })

  it('ADMIN_MINISTERE peut consulter le journal d\'audit', () => {
    expect(canDo(PERMISSIONS.AUDIT_CONSULTER, ['ADMIN_MINISTERE'])).toBe(true)
  })

  it('SAFF ne peut PAS consulter le journal d\'audit', () => {
    expect(canDo(PERMISSIONS.AUDIT_CONSULTER, ['SAFF'])).toBe(false)
  })

  it('ORDONNATEUR ne peut PAS consulter le journal d\'audit', () => {
    expect(canDo(PERMISSIONS.AUDIT_CONSULTER, ['ORDONNATEUR'])).toBe(false)
  })
})

// ─── fetchAuditLogs ───────────────────────────────────────────────────────────

describe('fetchAuditLogs', () => {
  it('filtre toujours par tenant_id', async () => {
    vi.mocked(supabase.from('audit_log').range).mockResolvedValueOnce({
      data: [], error: null, count: 0,
    } as never)

    await fetchAuditLogs({}, TENANT_ID)

    expect(vi.mocked(supabase.from)).toHaveBeenCalledWith('audit_log')
    expect(vi.mocked(supabase.from('audit_log').eq))
      .toHaveBeenCalledWith('tenant_id', TENANT_ID)
  })

  it('retourne { data, count } avec pagination', async () => {
    vi.mocked(supabase.from('audit_log').range).mockResolvedValueOnce({
      data: [
        {
          id: 'audit-entry-0001', tenant_id: TENANT_ID, user_id: USER_ID,
          user_email: 'test@mefb.gov.gn', action: 'engagement.visa.cf',
          table_name: 'engagements_depenses', record_id: 'eng-0001',
          old_values: null, new_values: null,
          created_at: '2026-01-15T10:30:00.000Z', signature: null,
          exercice_id: null, ip_address: null,
        },
      ],
      error: null,
      count: 42,
    } as never)

    const result = await fetchAuditLogs({ page: 1, pageSize: 20 }, TENANT_ID)

    expect(result.data).toHaveLength(1)
    expect(result.count).toBe(42)
    expect(result.data[0].action).toBe('engagement.visa.cf')
  })

  it('lève une erreur si Supabase retourne une erreur', async () => {
    vi.mocked(supabase.from('audit_log').range).mockResolvedValueOnce({
      data: null,
      error: { message: 'Permission denied', details: '', hint: '', code: '403' },
      count: null,
    } as never)

    await expect(fetchAuditLogs({}, TENANT_ID)).rejects.toThrow('Permission denied')
  })
})
