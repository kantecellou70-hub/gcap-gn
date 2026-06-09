import { supabase } from '@/shared/lib/supabase'
import {
  getPendingSyncItems,
  updateSyncItemStatus,
  deleteSyncItem,
  deleteBrouillon,
  type SyncQueueItem,
} from '@/shared/lib/indexedDb'

const MAX_RETRIES = 3

export interface SyncResult {
  success: number
  failed: number
  errors: string[]
}

async function processItem(item: SyncQueueItem): Promise<void> {
  if (!item.id) return

  await updateSyncItemStatus(item.id, 'syncing')

  if (item.type === 'CREATE_ENGAGEMENT') {
    const { error } = await supabase
      .from('engagements_depenses')
      .insert({
        tenant_id: item.payload.tenant_id,
        objet: item.payload.objet,
        montant_engage: item.payload.montant_engage,
        fournisseur: item.payload.fournisseur,
        ligne_budgetaire_id: item.payload.ligne_budgetaire_id,
        exercice_id: item.payload.exercice_id,
        created_by: item.user_id,
        statut: 'EN_ATTENTE_VISA',
        pieces_jointes: [],
        metadata: item.payload.metadata ?? {},
      })

    if (error) {
      const retries = item.retry_count + 1
      if (retries >= MAX_RETRIES) {
        await updateSyncItemStatus(
          item.id,
          'error',
          error.message,
        )
        throw new Error(error.message)
      }
      // Remettre en pending pour un prochain essai
      const db = (await import('@/shared/lib/indexedDb')).getDb
      const idb = await db()
      const current = await idb.get('sync_queue', item.id)
      if (current) {
        await idb.put('sync_queue', {
          ...current,
          status: 'pending',
          retry_count: retries,
        })
      }
      throw new Error(error.message)
    }

    // Succès — nettoyer le brouillon local
    const brouillonId = item.payload.local_id as string | undefined
    if (brouillonId) {
      await deleteBrouillon(brouillonId)
    }
    await deleteSyncItem(item.id)
  }
}

export const syncManager = {
  async syncPendingItems(): Promise<SyncResult> {
    const items = await getPendingSyncItems()
    const result: SyncResult = { success: 0, failed: 0, errors: [] }

    for (const item of items) {
      try {
        await processItem(item)
        result.success++
      } catch (err) {
        result.failed++
        result.errors.push(err instanceof Error ? err.message : 'Erreur inconnue')
      }
    }

    return result
  },

  async hasPendingItems(): Promise<boolean> {
    const items = await getPendingSyncItems()
    return items.length > 0
  },
}
