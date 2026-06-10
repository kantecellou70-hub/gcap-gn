import { supabase } from '@/shared/lib/supabase'

export interface TenantAvecStats {
  id: string
  code: string
  nom: string
  type: string
  statut: 'ACTIF' | 'SUSPENDU'
  nb_utilisateurs: number
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

// Retourne tous les tenants (y compris SUSPENDU) avec le nombre d'utilisateurs actifs.
// "Configuré" = au moins 1 user_profile actif — même définition que le dashboard M9.
export async function fetchTenantsAvecStats(): Promise<TenantAvecStats[]> {
  const [tenantsRes, profilesRes] = await Promise.all([
    supabase.from('tenants').select('*').order('nom'),
    supabase.from('user_profiles').select('tenant_id').eq('actif', true),
  ])

  if (tenantsRes.error) throw new Error(tenantsRes.error.message)
  if (profilesRes.error) throw new Error(profilesRes.error.message)

  const countByTenant = new Map<string, number>()
  for (const p of profilesRes.data ?? []) {
    const id = p.tenant_id as string
    countByTenant.set(id, (countByTenant.get(id) ?? 0) + 1)
  }

  return (tenantsRes.data ?? []).map((t) => {
    const nb = countByTenant.get(t.id as string) ?? 0
    return {
      id:                t.id as string,
      code:              t.code as string,
      nom:               t.nom as string,
      type:              t.type as string,
      statut:            t.statut as 'ACTIF' | 'SUSPENDU',
      nb_utilisateurs:   nb,
      statut_onboarding: nb > 0 ? 'actif' : 'non_active',
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
