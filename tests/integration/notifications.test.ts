import { describe, it, expect, vi, beforeEach } from 'vitest'
import { supabase } from '@/shared/lib/supabase'
import {
  fetchNotifications,
  marquerLue,
  marquerToutesLues,
} from '@/features/notifications/api/notifications-api'

const TENANT_ID = 'tenant-notif-0000-0000-000000000001'
const USER_ID   = 'user-notif-0000-0000-000000000001'

const mockNotif = {
  id: 'notif-0001',
  tenant_id: TENANT_ID,
  user_id: USER_ID,
  type: 'engagement_visa_requis',
  titre: 'Engagement en attente de visa',
  message: 'Un engagement nécessite votre visa',
  lu: false,
  priorite: 'normale',
  lien: '/engagements/eng-0001',
  metadata: {},
  created_at: '2026-01-15T10:00:00.000Z',
  lu_at: null,
}

const mockNotifUrgente = {
  ...mockNotif,
  id: 'notif-0002',
  type: 'mandat_rejete_tresor',
  titre: 'Mandat rejeté par le Trésor',
  priorite: 'urgente',
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('Notifications', () => {
  it('fetchNotifications filtre par user_id et tenant_id', async () => {
    vi.mocked(supabase.from('notifications').single).mockResolvedValueOnce({
      data: null, error: null,
    })

    await fetchNotifications(USER_ID, TENANT_ID)

    expect(vi.mocked(supabase.from)).toHaveBeenCalledWith('notifications')
    expect(vi.mocked(supabase.from('notifications').eq))
      .toHaveBeenCalledWith('user_id', USER_ID)
    expect(vi.mocked(supabase.from('notifications').eq))
      .toHaveBeenCalledWith('tenant_id', TENANT_ID)
  })

  it('fetchNotifications retourne les notifications mappées correctement', async () => {
    vi.mocked(supabase.from('notifications').limit).mockResolvedValueOnce({
      data: [mockNotif, mockNotifUrgente],
      error: null,
    } as never)

    const result = await fetchNotifications(USER_ID, TENANT_ID)

    expect(result).toHaveLength(2)
    expect(result[0].id).toBe('notif-0001')
    expect(result[0].lu).toBe(false)
    expect(result[0].priorite).toBe('normale')
  })

  it('Une notification urgente a priorite = "urgente"', async () => {
    vi.mocked(supabase.from('notifications').limit).mockResolvedValueOnce({
      data: [mockNotifUrgente],
      error: null,
    } as never)

    const result = await fetchNotifications(USER_ID, TENANT_ID)

    expect(result[0].priorite).toBe('urgente')
    expect(result[0].type).toBe('mandat_rejete_tresor')
  })

  it('marquerLue met à jour lu=true sur la notification ciblée', async () => {
    await marquerLue('notif-0001')

    expect(vi.mocked(supabase.from)).toHaveBeenCalledWith('notifications')
    expect(vi.mocked(supabase.from('notifications').update))
      .toHaveBeenCalledWith(
        expect.objectContaining({ lu: true, lu_at: expect.any(String) })
      )
    expect(vi.mocked(supabase.from('notifications').eq))
      .toHaveBeenCalledWith('id', 'notif-0001')
  })

  it('marquerLue stocke un timestamp ISO 8601 dans lu_at', async () => {
    const before = new Date().toISOString()

    await marquerLue('notif-0001')

    const updateArg = vi.mocked(supabase.from('notifications').update).mock.calls[0]?.[0] as Record<string, unknown>
    const luAt = updateArg?.lu_at as string

    expect(luAt).toBeTruthy()
    expect(new Date(luAt).toISOString()).toBe(luAt)
    expect(luAt >= before).toBe(true)
  })

  it('marquerToutesLues filtre par user_id, tenant_id et lu=false', async () => {
    await marquerToutesLues(USER_ID, TENANT_ID)

    expect(vi.mocked(supabase.from)).toHaveBeenCalledWith('notifications')
    expect(vi.mocked(supabase.from('notifications').update))
      .toHaveBeenCalledWith(
        expect.objectContaining({ lu: true })
      )
    expect(vi.mocked(supabase.from('notifications').eq))
      .toHaveBeenCalledWith('user_id', USER_ID)
    expect(vi.mocked(supabase.from('notifications').eq))
      .toHaveBeenCalledWith('tenant_id', TENANT_ID)
    expect(vi.mocked(supabase.from('notifications').eq))
      .toHaveBeenCalledWith('lu', false)
  })

  it('fetchNotifications retourne [] si aucune notification (pas d\'erreur)', async () => {
    vi.mocked(supabase.from('notifications').limit).mockResolvedValueOnce({
      data: [],
      error: null,
    } as never)

    const result = await fetchNotifications(USER_ID, TENANT_ID)
    expect(result).toEqual([])
  })

  it('fetchNotifications lève une erreur si Supabase retourne une erreur', async () => {
    vi.mocked(supabase.from('notifications').limit).mockResolvedValueOnce({
      data: null,
      error: { message: 'JWT expired', details: '', hint: '', code: '401' },
    } as never)

    await expect(fetchNotifications(USER_ID, TENANT_ID)).rejects.toThrow('JWT expired')
  })
})
