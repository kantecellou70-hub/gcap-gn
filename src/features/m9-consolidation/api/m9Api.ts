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

// Ordre de priorité pour le tri par statut tenant (finding #7)
const TENANT_STATUT_ORDER: Record<string, number> = {
  ACTIF:    0,
  SUSPENDU: 1,
  INACTIF:  2,
}

export async function fetchExecutionNationale(
  annee: number,
  roles: Role[]
): Promise<ExecutionMinistere[]> {
  assertSuperAdmin(roles)

  // 3 requêtes en parallèle : exécution, liste tenants, nombre d'utilisateurs par tenant
  const [
    { data: execData,    error: execError    },
    { data: tenants,     error: tenantError  },
    { data: userCounts,  error: userError    },
  ] = await Promise.all([
    supabase
      .from('v_execution_nationale')
      .select('*')
      .eq('annee', annee)
      // Tri déterministe : si un tenant a plusieurs exercices pour la même année
      // (budget rectificatif), le Map garde le dernier — OUVERT > CLOTURE alphabétiquement.
      .order('tenant_id')
      .order('exercice_statut'),
    // Finding #7 : inclure ACTIF et SUSPENDU pour ne pas sous-évaluer les dépenses
    // réelles d'un ministère suspendu en cours d'exercice dans les rapports LOLF.
    supabase
      .from('tenants')
      .select('id, nom, code, statut')
      .in('statut', ['ACTIF', 'SUSPENDU'])
      .order('nom'),
    // "Configuré" = au moins 1 user_profile actif.
    // Même définition que Administration > Gestion des ministères (tenantsAdmin-api).
    // RPC SECURITY DEFINER (migration 027) : agrégat côté serveur, accès direct à la
    // vue révoqué pour les rôles non-service_role.
    supabase.rpc('fn_users_actifs_par_tenant'),
  ])

  if (execError)   throw new Error(execError.message)
  if (tenantError) throw new Error(tenantError.message)
  if (userError)   throw new Error(userError.message)

  // Nombre d'utilisateurs actifs par tenant (1 ligne par tenant depuis le RPC)
  const nbUsers = new Map<string, number>(
    ((userCounts ?? []) as Array<{ tenant_id: string; nb_users: number }>)
      .map((r) => [r.tenant_id, r.nb_users ?? 0])
  )

  // Données d'exécution indexées par tenant
  const execMap = new Map(
    (execData ?? []).map((r) => [r.tenant_id as string, r as Omit<ExecutionMinistere, 'ral' | 'rap'>])
  )

  type TenantStatut = 'ACTIF' | 'SUSPENDU' | 'INACTIF'
  type WithMeta = ExecutionMinistere & {
    _hasUsers:     boolean
    _tenantStatut: TenantStatut
  }

  // Fusionner : execRow prime toujours sur emptyExecution.
  // emptyExecution uniquement si aucune donnée en base pour ce tenant.
  const merged: WithMeta[] = (tenants ?? []).map((t) => {
    const hasUsers    = (nbUsers.get(t.id as string) ?? 0) > 0
    const execRow     = execMap.get(t.id as string)
    const tenant      = t as { id: string; nom: string; code: string; statut: TenantStatut }

    const result = attachRal(execRow ?? emptyExecution(tenant, annee))
    return { ...result, _hasUsers: hasUsers, _tenantStatut: tenant.statut }
  })

  // Tri finding #7 :
  // 1. Ministères avec utilisateurs actifs en tête
  // 2. ACTIF avant SUSPENDU (dépenses réelles mais plus d'activité)
  // 3. Taux d'exécution décroissant à égalité
  merged.sort((a, b) => {
    if (a._hasUsers !== b._hasUsers) return a._hasUsers ? -1 : 1
    const aOrder = TENANT_STATUT_ORDER[a._tenantStatut] ?? 3
    const bOrder = TENANT_STATUT_ORDER[b._tenantStatut] ?? 3
    if (aOrder !== bOrder) return aOrder - bOrder
    return b.taux_execution_pct - a.taux_execution_pct
  })

  return merged.map(({ _hasUsers, _tenantStatut, ...rest }) => rest)
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

  // Finding #8 : agrégation côté serveur via RPC SECURITY DEFINER (migration 029).
  // Les queries directes sur mandats_paiement et engagements_depenses étaient
  // plafonnées à 1000 lignes par PostgREST — troncature silencieuse sur les
  // gros ministères. Les RPC retournent au plus 12 lignes (1 par mois).
  // make_timestamptz côté serveur garantit les bornes UTC.
  const [mandats, engagements] = await Promise.all([
    supabase.rpc('fn_evolution_mandats_mensuels', {
      p_tenant_id: tenantId,
      p_annee:     annee,
    }),
    supabase.rpc('fn_evolution_engagements_mensuels', {
      p_tenant_id: tenantId,
      p_annee:     annee,
    }),
  ])

  if (mandats.error)     throw new Error(mandats.error.message)
  if (engagements.error) throw new Error(engagements.error.message)

  // Initialiser les 12 mois à 0 — garantit un tableau complet même si
  // certains mois n'ont aucun mouvement (RPC ne retourne pas de ligne pour eux).
  const moisMap: Record<number, EvolutionMensuelle> = {}
  for (let m = 1; m <= 12; m++) {
    moisMap[m] = { mois: m, montant_paye: 0, montant_engage: 0 }
  }

  for (const row of (mandats.data ?? []) as Array<{ mois: number; montant_paye: number }>) {
    moisMap[row.mois].montant_paye += Number(row.montant_paye)
  }
  for (const row of (engagements.data ?? []) as Array<{ mois: number; montant_engage: number }>) {
    moisMap[row.mois].montant_engage += Number(row.montant_engage)
  }

  return Object.values(moisMap)
}

export async function fetchDataForLolfExport(
  annee: number,
  roles: Role[]
): Promise<ExecutionMinistere[]> {
  const all = await fetchExecutionNationale(annee, roles)
  // Double garde : exclure uniquement les ministères NON_CONFIGURE et les dotations nulles.
  // Les tenants SUSPENDU sont INCLUS — leurs dépenses engagées sont réelles et doivent
  // figurer dans les rapports LOLF transmis à la Cour des Comptes.
  return all.filter(
    (m) => m.exercice_statut !== 'NON_CONFIGURE' && m.dotation_totale > 0
  )
}
