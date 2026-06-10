import { supabase } from '@/shared/lib/supabase'
import { canDo } from '@/shared/lib/utils'
import type { Role } from '@/shared/types'
import type {
  ExecutionMinistere,
  AlerteNationale,
  NationalExercice,
  EvolutionMensuelle,
} from '../types'

function assertSuperAdmin(roles: Role[]): void {
  if (!canDo('consolidation.nationale', roles)) {
    throw new Error('Accès refusé — consolidation nationale réservée au SUPER_ADMIN')
  }
}

function attachRal(row: Omit<ExecutionMinistere, 'ral' | 'rap'>): ExecutionMinistere {
  return {
    ...row,
    ral: Math.max(0, row.montant_engage_vise - row.montant_liquide),
    rap: row.montant_en_cours_paiement,
  }
}

function emptyExecution(
  tenant: { id: string; nom: string; code: string },
  annee: number
): Omit<ExecutionMinistere, 'ral' | 'rap'> {
  return {
    tenant_id:                   tenant.id,
    ministere_nom:               tenant.nom,
    ministere_code:              tenant.code,
    exercice_id:                 '',
    annee,
    exercice_statut:             'NON_CONFIGURE',
    dotation_totale:             0,
    credits_consommes:           0,
    nb_engagements_vises:        0,
    montant_engage_vise:         0,
    nb_engagements_en_attente:   0,
    montant_liquide:             0,
    montant_paye:                0,
    montant_en_cours_paiement:   0,
    recettes_constatees:         0,
    recettes_recouvrees:         0,
    taux_execution_pct:          0,
    taux_engagement_pct:         0,
  }
}

export async function fetchExecutionNationale(
  annee: number,
  roles: Role[]
): Promise<ExecutionMinistere[]> {
  assertSuperAdmin(roles)

  // 1. Données d'exécution pour l'année (uniquement les tenants avec un exercice)
  const [{ data: execData, error: execError }, { data: tenants, error: tenantError }] =
    await Promise.all([
      supabase
        .from('v_execution_nationale')
        .select('*')
        .eq('annee', annee)
        .order('taux_execution_pct', { ascending: false }),
      supabase
        .from('tenants')
        .select('id, nom, code')
        .eq('statut', 'ACTIF')
        .order('nom'),
    ])

  if (execError)   throw new Error(execError.message)
  if (tenantError) throw new Error(tenantError.message)

  // 2. Fusionner : les tenants sans exercice obtiennent une ligne à zéro
  const execMap = new Map(
    (execData ?? []).map((r) => [r.tenant_id as string, r as Omit<ExecutionMinistere, 'ral' | 'rap'>])
  )

  const merged = (tenants ?? []).map((t) =>
    attachRal(
      execMap.get(t.id as string) ??
      emptyExecution(t as { id: string; nom: string; code: string }, annee)
    )
  )

  // 3. Trier : ministères avec exercice en tête (taux décroissant), sans exercice à la fin
  merged.sort((a, b) => {
    const aHas = a.exercice_statut !== 'NON_CONFIGURE'
    const bHas = b.exercice_statut !== 'NON_CONFIGURE'
    if (aHas !== bHas) return aHas ? -1 : 1
    return b.taux_execution_pct - a.taux_execution_pct
  })

  return merged
}

export async function fetchAlertesNationales(
  roles: Role[]
): Promise<AlerteNationale[]> {
  assertSuperAdmin(roles)

  const { data, error } = await supabase
    .from('v_alertes_nationales')
    .select('*')
    .order('taux_execution_pct', { ascending: true })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function fetchNationalExercices(
  roles: Role[]
): Promise<NationalExercice[]> {
  assertSuperAdmin(roles)

  const { data, error } = await supabase
    .from('v_national_exercice')
    .select('*')
    .order('annee', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function fetchEvolutionMensuelle(
  tenantId: string,
  annee: number,
  roles: Role[]
): Promise<EvolutionMensuelle[]> {
  assertSuperAdmin(roles)

  const debut = `${annee}-01-01`
  const fin   = `${annee}-12-31`

  const [mandats, engagements] = await Promise.all([
    supabase
      .from('mandats_paiement')
      .select('montant, date_emission')
      .eq('tenant_id', tenantId)
      .eq('statut', 'PAYE')
      .gte('date_emission', debut)
      .lte('date_emission', fin),
    supabase
      .from('engagements_depenses')
      .select('montant_engage, date_creation')
      .eq('tenant_id', tenantId)
      .eq('statut', 'VISE')
      .gte('date_creation', debut)
      .lte('date_creation', fin),
  ])

  if (mandats.error) throw new Error(mandats.error.message)
  if (engagements.error) throw new Error(engagements.error.message)

  const moisMap: Record<number, EvolutionMensuelle> = {}
  for (let m = 1; m <= 12; m++) {
    moisMap[m] = { mois: m, montant_paye: 0, montant_engage: 0 }
  }

  for (const row of mandats.data ?? []) {
    const mois = new Date(row.date_emission as string).getMonth() + 1
    moisMap[mois].montant_paye += row.montant as number
  }

  for (const row of engagements.data ?? []) {
    const mois = new Date(row.date_creation as string).getMonth() + 1
    moisMap[mois].montant_engage += row.montant_engage as number
  }

  return Object.values(moisMap)
}

export async function fetchDataForLolfExport(
  annee: number,
  roles: Role[]
): Promise<ExecutionMinistere[]> {
  return fetchExecutionNationale(annee, roles)
}
