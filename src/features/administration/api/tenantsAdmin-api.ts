import { supabase } from '@/shared/lib/supabase'

export interface TenantAvecStats {
  id: string
  code: string
  nom: string
  type: string
  statut: 'ACTIF' | 'SUSPENDU'
  nb_utilisateurs: number      // utilisateurs actifs (actif = true)
  nb_users_total: number       // tous utilisateurs — conditionne l'affichage du bouton "Activer"
  statut_onboarding: 'non_active' | 'actif'
}

export interface CreateMinistereUserPayload {
  email: string
  nom: string
  prenom: string
  poste: string
  role: 'ADMIN_MINISTERE' | 'DAFF' | 'ORDONNATEUR' | 'CF'
  tenant_id: string
}

// Retourne tous les tenants (y compris SUSPENDU) avec le nombre d'utilisateurs actifs et total.
// "Configuré" = au moins 1 user_profile actif — même définition que le dashboard M9.
// "Activer" s'affiche uniquement si nb_users_total === 0 (jamais de compte créé).
export async function fetchTenantsAvecStats(): Promise<TenantAvecStats[]> {
  const [tenantsRes, actifsRes, totalRes] = await Promise.all([
    supabase.from('tenants').select('*').order('nom'),
    supabase.from('user_profiles').select('tenant_id').eq('actif', true),
    supabase.from('user_profiles').select('tenant_id'),
  ])

  if (tenantsRes.error) throw new Error(tenantsRes.error.message)
  if (actifsRes.error)  throw new Error(actifsRes.error.message)
  if (totalRes.error)   throw new Error(totalRes.error.message)

  const countActifs = new Map<string, number>()
  for (const p of actifsRes.data ?? []) {
    const id = p.tenant_id as string
    countActifs.set(id, (countActifs.get(id) ?? 0) + 1)
  }

  const countTotal = new Map<string, number>()
  for (const p of totalRes.data ?? []) {
    const id = p.tenant_id as string
    countTotal.set(id, (countTotal.get(id) ?? 0) + 1)
  }

  return (tenantsRes.data ?? []).map((t) => {
    const nbActifs = countActifs.get(t.id as string) ?? 0
    const nbTotal  = countTotal.get(t.id as string) ?? 0
    return {
      id:                t.id as string,
      code:              t.code as string,
      nom:               t.nom as string,
      type:              t.type as string,
      statut:            t.statut as 'ACTIF' | 'SUSPENDU',
      nb_utilisateurs:   nbActifs,
      nb_users_total:    nbTotal,
      statut_onboarding: nbActifs > 0 ? 'actif' : 'non_active',
    }
  })
}

// Active ou suspend un tenant
export async function updateTenantStatut(
  tenantId: string,
  statut: 'ACTIF' | 'SUSPENDU'
): Promise<void> {
  const { error } = await supabase
    .from('tenants')
    .update({ statut })
    .eq('id', tenantId)

  if (error) throw new Error(error.message)
}

// Appelle la Edge Function pour créer un utilisateur ministériel
export async function creerUtilisateurMinistere(
  payload: CreateMinistereUserPayload
): Promise<{ user_id: string }> {
  const { data, error } = await supabase.functions.invoke<{ user_id: string }>(
    'create-ministry-user',
    { body: payload }
  )
  if (error) throw new Error(error.message)
  if (!data?.user_id) throw new Error('Réponse invalide de la fonction.')
  return data
}
