import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/shared/lib/supabase'
import { useTenant } from '@/app/contexts/TenantContext'
import { useAuth } from '@/app/contexts/AuthContext'
import {
  cacheNomenclature,
  cacheLignesBudgetaires,
  cacheEngagements,
  cacheProfil,
  evictOldEngagementsIfNeeded,
} from '@/shared/lib/indexedDb'

const REFRESH_INTERVAL_MS = 4 * 60 * 60 * 1000 // 4 heures

function formatCacheSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

export function useOfflineCache() {
  const { tenantId, tenantActif, exerciceActif } = useTenant()
  const { profil } = useAuth()
  const [isCaching, setIsCaching] = useState(false)
  const [lastCachedAt, setLastCachedAt] = useState<string | null>(null)
  const [cacheSize, setCacheSize] = useState<string>('—')
  const isRunningRef = useRef(false)

  async function estimateCacheSize(): Promise<void> {
    if (!navigator.storage?.estimate) return
    const { usage } = await navigator.storage.estimate()
    setCacheSize(formatCacheSize(usage ?? 0))
  }

  async function populateCache() {
    if (
      isRunningRef.current ||
      !navigator.onLine ||
      !tenantId ||
      !exerciceActif ||
      !profil ||
      !tenantActif
    )
      return

    isRunningRef.current = true
    setIsCaching(true)

    try {
      // 1. Nomenclature budgétaire
      const { data: nomenclature } = await supabase
        .from('nomenclature_budgetaire')
        .select('*')
        .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
        .eq('actif', true)
        .limit(500)
      if (nomenclature) {
        await cacheNomenclature(nomenclature as Parameters<typeof cacheNomenclature>[0], tenantId)
      }

      // 2. Lignes budgétaires de l'exercice courant
      const { data: lignes } = await supabase
        .from('lignes_budgetaires')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('exercice_id', exerciceActif.id)
        .limit(200)
      if (lignes) {
        await cacheLignesBudgetaires(
          lignes as Parameters<typeof cacheLignesBudgetaires>[0],
          tenantId,
          exerciceActif.id,
        )
      }

      // 3. Les 50 derniers engagements
      const { data: engagements } = await supabase
        .from('engagements_depenses')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('date_creation', { ascending: false })
        .limit(50)
      if (engagements) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await cacheEngagements(engagements as any, tenantId)
        await evictOldEngagementsIfNeeded(tenantId)
      }

      // 4. Profil utilisateur
      await cacheProfil({
        profil,
        role: profil.roles[0] ?? '',
        tenant: tenantActif,
      })

      setLastCachedAt(new Date().toISOString())
      await estimateCacheSize()
    } catch {
      // Échec silencieux — le cache offline n'est pas critique pour le rendu
    } finally {
      isRunningRef.current = false
      setIsCaching(false)
    }
  }

  useEffect(() => {
    void populateCache()
    const interval = setInterval(() => {
      if (navigator.onLine) void populateCache()
    }, REFRESH_INTERVAL_MS)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, exerciceActif?.id, profil?.id])

  return { isCaching, lastCachedAt, cacheSize }
}
