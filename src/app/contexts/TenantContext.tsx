/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { supabase } from '@/shared/lib/supabase'
import type { Tenant, ExerciceBudgetaire } from '@/shared/types'
import { useAuth } from './AuthContext'

const SESSION_KEY = 'gcap-active-tenant-id'

interface TenantContextValue {
  // Tenant d'appartenance du compte (immuable)
  tenantOrigine: Tenant | null

  // Tenant actuellement affiché — peut différer pour le SUPER_ADMIN
  // Toutes les requêtes features utilisent tenantId = tenantActif?.id
  tenantActif: Tenant | null

  // Alias backward-compatible (= tenantActif)
  tenant: Tenant | null
  tenantId: string | null

  // Exercice actif du tenant affiché
  exerciceActif: ExerciceBudgetaire | null
  setExerciceActif: (e: ExerciceBudgetaire) => void

  // Tous les tenants actifs (chargés uniquement pour SUPER_ADMIN)
  tousLesTenants: Tenant[]

  // Basculer vers un autre tenant (SUPER_ADMIN uniquement)
  switchTenant: (tenantId: string) => Promise<void>

  // Revenir au tenant d'appartenance
  resetTenant: () => void

  // Vrai si le SUPER_ADMIN inspecte un tenant différent du sien
  isImpersonating: boolean

  isLoading: boolean
  hasNoExercice: boolean
}

const TenantContext = createContext<TenantContextValue | null>(null)

// ─── Helpers ────────────────────────────────────────────────────────────────

function mapTenant(row: Record<string, unknown>): Tenant {
  return {
    id:        row.id as string,
    code:      row.code as string,
    nom:       row.nom as string,
    type:      row.type as Tenant['type'],
    statut:    row.statut as Tenant['statut'],
    createdAt: row.created_at as string,
  }
}

async function loadTenant(id: string): Promise<Tenant | null> {
  const { data } = await supabase.from('tenants').select('*').eq('id', id).single()
  return data ? mapTenant(data as Record<string, unknown>) : null
}

async function loadExerciceActif(tenantId: string): Promise<ExerciceBudgetaire | null> {
  const { data } = await supabase
    .from('exercices_budgetaires')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('statut', 'OUVERT')
    .order('annee', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data) return null
  return {
    id:            data.id as string,
    tenantId:      data.tenant_id as string,
    annee:         data.annee as number,
    statut:        data.statut as ExerciceBudgetaire['statut'],
    dateOuverture: data.date_ouverture as string,
    dateCloture:   data.date_cloture as string | undefined,
  }
}

async function loadTousLesTenants(): Promise<Tenant[]> {
  const { data } = await supabase
    .from('tenants')
    .select('*')
    .eq('statut', 'ACTIF')
    .order('nom', { ascending: true })
  return (data ?? []).map((r) => mapTenant(r as Record<string, unknown>))
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function TenantProvider({ children }: { children: ReactNode }) {
  const { profil } = useAuth()

  const [tenantOrigine, setTenantOrigine]   = useState<Tenant | null>(null)
  const [tenantActif,   setTenantActifState] = useState<Tenant | null>(null)
  const [exerciceActif, setExerciceActif]    = useState<ExerciceBudgetaire | null>(null)
  const [tousLesTenants, setTousLesTenants]  = useState<Tenant[]>([])
  const [isLoading,      setIsLoading]       = useState(false)
  const [hasNoExercice,  setHasNoExercice]   = useState(false)

  const isSuperAdmin = profil?.roles?.includes('SUPER_ADMIN') ?? false

  // ── Chargement initial ─────────────────────────────────────────────────────
  useEffect(() => {
    const originId = profil?.tenantId ?? null
    if (!originId) {
      setTenantOrigine(null)
      setTenantActifState(null)
      setExerciceActif(null)
      setTousLesTenants([])
      return
    }

    setIsLoading(true)

    const savedId = isSuperAdmin ? sessionStorage.getItem(SESSION_KEY) : null

    const promises: Promise<unknown>[] = [
      loadTenant(originId),
      isSuperAdmin ? loadTousLesTenants() : Promise.resolve([]),
    ]

    // Si un tenant sauvegardé existe et diffère de l'origine, on le charge aussi
    if (savedId && savedId !== originId) {
      promises.push(loadTenant(savedId))
    }

    Promise.all(promises).then(async (results) => {
      const origine  = results[0] as Tenant | null
      const tous     = results[1] as Tenant[]
      const saved    = (results[2] as Tenant | null) ?? null

      setTenantOrigine(origine)
      setTousLesTenants(tous)

      const actif = saved ?? origine
      setTenantActifState(actif)

      if (actif) {
        const exercice = await loadExerciceActif(actif.id)
        setExerciceActif(exercice)
        setHasNoExercice(!exercice)
      }

      setIsLoading(false)
    })
  }, [profil?.tenantId, isSuperAdmin])

  // ── switchTenant ───────────────────────────────────────────────────────────
  const switchTenant = useCallback(async (id: string) => {
    if (!isSuperAdmin) throw new Error('switchTenant réservé au SUPER_ADMIN')

    // Chercher d'abord dans la liste déjà chargée
    const fromCache = tousLesTenants.find((t) => t.id === id)
    const cible = fromCache ?? await loadTenant(id)
    if (!cible) throw new Error(`Tenant introuvable : ${id}`)

    const exercice = await loadExerciceActif(id)
    sessionStorage.setItem(SESSION_KEY, id)
    setTenantActifState(cible)
    setExerciceActif(exercice)
    setHasNoExercice(!exercice)
  }, [isSuperAdmin, tousLesTenants])

  // ── resetTenant ────────────────────────────────────────────────────────────
  const resetTenant = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY)
    setTenantActifState(tenantOrigine)
    if (tenantOrigine) {
      loadExerciceActif(tenantOrigine.id).then((e) => {
        setExerciceActif(e)
        setHasNoExercice(!e)
      })
    }
  }, [tenantOrigine])

  const isImpersonating = !!(
    tenantActif &&
    tenantOrigine &&
    tenantActif.id !== tenantOrigine.id
  )

  // tenantId = id du tenant actif (les hooks features utilisent cet alias)
  const tenantId = tenantActif?.id ?? null

  return (
    <TenantContext.Provider
      value={{
        tenantOrigine,
        tenantActif,
        tenant:       tenantActif,
        tenantId,
        exerciceActif,
        setExerciceActif,
        tousLesTenants,
        switchTenant,
        resetTenant,
        isImpersonating,
        isLoading,
        hasNoExercice,
      }}
    >
      {hasNoExercice && !isImpersonating && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center text-sm text-amber-800">
          ⚠️ Aucun exercice budgétaire ouvert pour votre ministère. Contactez l'administrateur.
        </div>
      )}
      {children}
    </TenantContext.Provider>
  )
}

export function useTenant(): TenantContextValue {
  const ctx = useContext(TenantContext)
  if (!ctx) throw new Error('useTenant doit être utilisé dans TenantProvider')
  return ctx
}
