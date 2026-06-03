/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '@/shared/lib/supabase'
import type { Tenant, ExerciceBudgetaire } from '@/shared/types'
import { useAuth } from './AuthContext'

interface TenantContextValue {
  tenant: Tenant | null
  tenantId: string | null
  exerciceActif: ExerciceBudgetaire | null
  isLoading: boolean
  hasNoExercice: boolean
  setExerciceActif: (e: ExerciceBudgetaire) => void
}

const TenantContext = createContext<TenantContextValue | null>(null)

export function TenantProvider({ children }: { children: ReactNode }) {
  const { profil } = useAuth()
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [exerciceActif, setExerciceActif] = useState<ExerciceBudgetaire | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [hasNoExercice, setHasNoExercice] = useState(false)

  const tenantId = profil?.tenantId ?? null

  useEffect(() => {
    if (!tenantId) {
      setTenant(null)
      setExerciceActif(null)
      return
    }

    setIsLoading(true)

    Promise.all([
      supabase
        .from('tenants')
        .select('*')
        .eq('id', tenantId)
        .single(),
      supabase
        .from('exercices_budgetaires')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('statut', 'OUVERT')
        .order('annee', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]).then(([tenantRes, exerciceRes]) => {
      if (tenantRes.data) {
        setTenant({
          id: tenantRes.data.id,
          code: tenantRes.data.code,
          nom: tenantRes.data.nom,
          type: tenantRes.data.type,
          statut: tenantRes.data.statut,
          createdAt: tenantRes.data.created_at,
        })
      }
      if (exerciceRes.data) {
        setExerciceActif({
          id: exerciceRes.data.id,
          tenantId: exerciceRes.data.tenant_id,
          annee: exerciceRes.data.annee,
          statut: exerciceRes.data.statut,
          dateOuverture: exerciceRes.data.date_ouverture,
          dateCloture: exerciceRes.data.date_cloture ?? undefined,
        })
        setHasNoExercice(false)
      } else {
        setHasNoExercice(true)
      }
      setIsLoading(false)
    })
  }, [tenantId])

  return (
    <TenantContext.Provider
      value={{
        tenant,
        tenantId,
        exerciceActif,
        isLoading,
        hasNoExercice,
        setExerciceActif,
      }}
    >
      {hasNoExercice && (
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
