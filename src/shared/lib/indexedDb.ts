import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type {
  NomenclatureBudgetaire,
  LigneBudgetaire,
  UserProfile,
  Tenant,
} from '@/shared/types'
import type { Engagement } from '@/features/engagements/types'

// ─── Types offline ──────────────────────────────────────────────────────────

export interface SyncQueueItem {
  id?: number
  type: 'CREATE_ENGAGEMENT' | 'UPDATE_ENGAGEMENT'
  payload: Record<string, unknown>
  tenant_id: string
  user_id: string
  created_at: string
  status: 'pending' | 'syncing' | 'error'
  retry_count: number
  error_message?: string
}

export interface BrouillonEngagement {
  id: string
  tenant_id: string
  user_id: string
  objet: string
  montant_engage: number
  fournisseur_nom?: string
  fournisseur_nif?: string
  ligne_budgetaire_id: string
  description?: string
  exercice_id: string
  created_at: string
  updated_at: string
  is_draft: true
}

interface ProfilCache {
  profil: UserProfile
  role: string
  tenant: Tenant
}

// ─── Schéma IndexedDB ───────────────────────────────────────────────────────

interface GcapDB extends DBSchema {
  nomenclature: {
    key: string
    value: NomenclatureBudgetaire & { _tenantId: string }
    indexes: { 'by-tenant': string }
  }
  lignes_budgetaires: {
    key: string
    value: LigneBudgetaire & { _tenantId: string; _exerciceId: string }
    indexes: { 'by-tenant-exercice': [string, string] }
  }
  engagements_cache: {
    key: string
    value: Engagement & { _tenantId: string }
    indexes: { 'by-tenant': string; 'by-date': string }
  }
  profil_utilisateur: {
    key: string
    value: ProfilCache
  }
  sync_queue: {
    key: number
    value: SyncQueueItem
    indexes: { 'by-status': string; 'by-created-at': string }
  }
  brouillons_engagements: {
    key: string
    value: BrouillonEngagement
    indexes: { 'by-tenant': string; 'by-created-at': string }
  }
}

// ─── Singleton DB ───────────────────────────────────────────────────────────

let dbPromise: Promise<IDBPDatabase<GcapDB>> | null = null

export function getDb(): Promise<IDBPDatabase<GcapDB>> {
  if (!dbPromise) {
    dbPromise = openDB<GcapDB>('gcap-gn-offline', 1, {
      upgrade(db) {
        const nomenclatureStore = db.createObjectStore('nomenclature', { keyPath: 'id' })
        nomenclatureStore.createIndex('by-tenant', '_tenantId')

        const lignesStore = db.createObjectStore('lignes_budgetaires', { keyPath: 'id' })
        lignesStore.createIndex('by-tenant-exercice', ['_tenantId', '_exerciceId'])

        const engagementsStore = db.createObjectStore('engagements_cache', { keyPath: 'id' })
        engagementsStore.createIndex('by-tenant', '_tenantId')
        engagementsStore.createIndex('by-date', 'dateCreation')

        db.createObjectStore('profil_utilisateur', { keyPath: 'profil.id' })

        const syncStore = db.createObjectStore('sync_queue', { keyPath: 'id', autoIncrement: true })
        syncStore.createIndex('by-status', 'status')
        syncStore.createIndex('by-created-at', 'created_at')

        const brouillonsStore = db.createObjectStore('brouillons_engagements', { keyPath: 'id' })
        brouillonsStore.createIndex('by-tenant', 'tenant_id')
        brouillonsStore.createIndex('by-created-at', 'created_at')
      },
    })
  }
  return dbPromise
}

// ─── Nomenclature ───────────────────────────────────────────────────────────

export async function cacheNomenclature(
  items: NomenclatureBudgetaire[],
  tenantId: string,
): Promise<void> {
  const db = await getDb()
  const tx = db.transaction('nomenclature', 'readwrite')
  await Promise.all([
    ...items.map((item) => tx.store.put({ ...item, _tenantId: tenantId })),
    tx.done,
  ])
}

export async function getCachedNomenclature(
  tenantId: string,
): Promise<NomenclatureBudgetaire[]> {
  const db = await getDb()
  const items = await db.getAllFromIndex('nomenclature', 'by-tenant', tenantId)
  return items.map(({ _tenantId, ...item }) => item as NomenclatureBudgetaire)
}

// ─── Lignes budgétaires ─────────────────────────────────────────────────────

export async function cacheLignesBudgetaires(
  lignes: LigneBudgetaire[],
  tenantId: string,
  exerciceId: string,
): Promise<void> {
  const db = await getDb()
  const tx = db.transaction('lignes_budgetaires', 'readwrite')
  await Promise.all([
    ...lignes.map((l) => tx.store.put({ ...l, _tenantId: tenantId, _exerciceId: exerciceId })),
    tx.done,
  ])
}

export async function getCachedLignes(
  tenantId: string,
  exerciceId: string,
): Promise<LigneBudgetaire[]> {
  const db = await getDb()
  const items = await db.getAllFromIndex(
    'lignes_budgetaires',
    'by-tenant-exercice',
    [tenantId, exerciceId],
  )
  return items.map(({ _tenantId, _exerciceId, ...l }) => l as LigneBudgetaire)
}

// ─── Engagements cache ──────────────────────────────────────────────────────

export async function cacheEngagements(
  engagements: Engagement[],
  tenantId: string,
): Promise<void> {
  const db = await getDb()
  const tx = db.transaction('engagements_cache', 'readwrite')
  await Promise.all([
    ...engagements.map((e) => tx.store.put({ ...e, _tenantId: tenantId })),
    tx.done,
  ])
}

export async function getCachedEngagements(tenantId: string): Promise<Engagement[]> {
  const db = await getDb()
  const items = await db.getAllFromIndex('engagements_cache', 'by-tenant', tenantId)
  return items.map(({ _tenantId, ...e }) => e as Engagement)
}

// ─── Profil utilisateur ─────────────────────────────────────────────────────

export async function cacheProfil(data: ProfilCache): Promise<void> {
  const db = await getDb()
  await db.put('profil_utilisateur', data)
}

export async function getCachedProfil(userId: string): Promise<ProfilCache | undefined> {
  const db = await getDb()
  return db.get('profil_utilisateur', userId)
}

// ─── Brouillons ─────────────────────────────────────────────────────────────

export async function saveBrouillon(brouillon: BrouillonEngagement): Promise<void> {
  const db = await getDb()
  await db.put('brouillons_engagements', brouillon)
}

export async function getBrouillons(tenantId: string): Promise<BrouillonEngagement[]> {
  const db = await getDb()
  return db.getAllFromIndex('brouillons_engagements', 'by-tenant', tenantId)
}

export async function getBrouillon(id: string): Promise<BrouillonEngagement | undefined> {
  const db = await getDb()
  return db.get('brouillons_engagements', id)
}

export async function deleteBrouillon(id: string): Promise<void> {
  const db = await getDb()
  await db.delete('brouillons_engagements', id)
}

// ─── File de synchronisation ────────────────────────────────────────────────

export async function addToSyncQueue(
  item: Omit<SyncQueueItem, 'id' | 'status' | 'retry_count'>,
): Promise<void> {
  const db = await getDb()
  await db.add('sync_queue', { ...item, status: 'pending', retry_count: 0 })
}

export async function getPendingSyncItems(): Promise<SyncQueueItem[]> {
  const db = await getDb()
  return db.getAllFromIndex('sync_queue', 'by-status', 'pending')
}

export async function getErrorSyncItems(): Promise<SyncQueueItem[]> {
  const db = await getDb()
  return db.getAllFromIndex('sync_queue', 'by-status', 'error')
}

export async function updateSyncItemStatus(
  id: number,
  status: SyncQueueItem['status'],
  error?: string,
): Promise<void> {
  const db = await getDb()
  const item = await db.get('sync_queue', id)
  if (!item) return
  await db.put('sync_queue', { ...item, status, error_message: error })
}

export async function deleteSyncItem(id: number): Promise<void> {
  const db = await getDb()
  await db.delete('sync_queue', id)
}

export async function getSyncQueueStats(): Promise<{ pending: number; error: number }> {
  const [pending, error] = await Promise.all([
    getPendingSyncItems(),
    getErrorSyncItems(),
  ])
  return { pending: pending.length, error: error.length }
}

// ─── Politique d'éviction (max 5 Mo approx.) ────────────────────────────────

const MAX_CACHE_ENTRIES = 50

export async function evictOldEngagementsIfNeeded(tenantId: string): Promise<void> {
  const db = await getDb()
  const all = await db.getAllFromIndex('engagements_cache', 'by-tenant', tenantId)
  if (all.length <= MAX_CACHE_ENTRIES) return
  const sorted = [...all].sort(
    (a, b) => new Date(a.dateCreation).getTime() - new Date(b.dateCreation).getTime(),
  )
  const toDelete = sorted.slice(0, all.length - MAX_CACHE_ENTRIES)
  const tx = db.transaction('engagements_cache', 'readwrite')
  await Promise.all([...toDelete.map((e) => tx.store.delete(e.id)), tx.done])
}
