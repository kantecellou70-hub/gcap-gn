import { supabase } from '@/shared/lib/supabase'
import type {
  UtilisateurAvecRoles, InviteInput, Fournisseur, FournisseurInput, Role, ExerciceBudgetaire,
} from '../types'

// ─── Utilisateurs ────────────────────────────────────────────────────────────

export async function fetchUtilisateurs(tenantId: string): Promise<UtilisateurAvecRoles[]> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*, roles:user_roles(role, actif)')
    .eq('tenant_id', tenantId)
    .order('nom')

  if (error) throw new Error(error.message)

  return (data ?? []).map((u) => ({
    id:         u.id as string,
    tenantId:   u.tenant_id as string,
    nom:        u.nom as string,
    prenom:     u.prenom as string,
    matricule:  u.matricule as string | undefined,
    poste:      u.poste as string | undefined,
    telephone:  u.telephone as string | undefined,
    createdAt:  u.created_at as string,
    actif:      (u.actif as boolean) ?? true,
    roles:      ((u.roles as { role: string }[]) ?? []).map((r) => r.role as Role),
    rolesDetail:((u.roles as { role: string; actif: boolean }[]) ?? []).map((r) => ({
      role: r.role as Role, actif: r.actif,
    })),
  }))
}

export async function inviterUtilisateur(
  input: InviteInput,
  tenantId: string
): Promise<{ motDePasse: string }> {
  // Créer l'utilisateur auth avec le mot de passe temporaire fourni
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email:    input.email,
    password: input.motDePasse,
  })

  if (authError) throw new Error(authError.message)
  const userId = authData.user?.id
  if (!userId) throw new Error('Erreur lors de la création du compte.')

  // Créer le profil
  const { error: profErr } = await supabase.from('user_profiles').insert({
    id:        userId,
    tenant_id: tenantId,
    nom:       input.nom,
    prenom:    input.prenom,
    poste:     input.poste ?? null,
  })
  if (profErr) throw new Error(profErr.message)

  // Assigner le rôle
  const { error: roleErr } = await supabase.from('user_roles').insert({
    user_id:   userId,
    tenant_id: tenantId,
    role:      input.role,
    actif:     true,
  })
  if (roleErr) throw new Error(roleErr.message)

  return { motDePasse: input.motDePasse }
}

export async function modifierRoleUtilisateur(
  userId: string,
  tenantId: string,
  nouveauRole: Role
): Promise<void> {
  // Désactiver les anciens rôles
  await supabase
    .from('user_roles')
    .update({ actif: false })
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)

  // Insérer ou réactiver le nouveau rôle
  const { error } = await supabase
    .from('user_roles')
    .upsert({ user_id: userId, tenant_id: tenantId, role: nouveauRole, actif: true })

  if (error) throw new Error(error.message)
}

export async function desactiverUtilisateur(userId: string, tenantId: string): Promise<void> {
  const { error } = await supabase
    .from('user_profiles')
    .update({ actif: false })
    .eq('id', userId)
    .eq('tenant_id', tenantId)

  if (error) throw new Error(error.message)
}

export async function reactiverUtilisateur(userId: string, tenantId: string): Promise<void> {
  const { error } = await supabase
    .from('user_profiles')
    .update({ actif: true })
    .eq('id', userId)
    .eq('tenant_id', tenantId)

  if (error) throw new Error(error.message)
}

// ─── Exercices ────────────────────────────────────────────────────────────────

export async function fetchExercicesAdmin(tenantId: string): Promise<ExerciceBudgetaire[]> {
  const { data, error } = await supabase
    .from('exercices_budgetaires')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('annee', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []).map((e) => ({
    id:            e.id as string,
    tenantId:      e.tenant_id as string,
    annee:         e.annee as number,
    statut:        e.statut as ExerciceBudgetaire['statut'],
    dateOuverture: e.date_ouverture as string,
    dateCloture:   e.date_cloture as string | undefined,
  }))
}

export async function updateStatutExercice(
  id: string,
  statut: ExerciceBudgetaire['statut'],
  tenantId: string
): Promise<void> {
  const patch: Record<string, unknown> = { statut }
  if (statut === 'CLOTURE') patch.date_cloture = new Date().toISOString().split('T')[0]

  const { error } = await supabase
    .from('exercices_budgetaires')
    .update(patch)
    .eq('id', id)
    .eq('tenant_id', tenantId)

  if (error) throw new Error(error.message)
}

export async function createExercice(annee: number, tenantId: string): Promise<void> {
  const { error } = await supabase
    .from('exercices_budgetaires')
    .insert({
      tenant_id:      tenantId,
      annee,
      statut:         'OUVERT',
      date_ouverture: new Date().toISOString().split('T')[0],
    })

  if (error) throw new Error(error.message)
}

// ─── Fournisseurs ────────────────────────────────────────────────────────────

function mapFournisseur(row: Record<string, unknown>): Fournisseur {
  return {
    id:            row.id as string,
    tenantId:      row.tenant_id as string,
    code:          row.code as string,
    denomination:  row.denomination as string,
    nif:           row.nif as string | undefined,
    rccm:          row.rccm as string | undefined,
    telephone:     row.telephone as string | undefined,
    email:         row.email as string | undefined,
    adresse:       row.adresse as string | undefined,
    banque:        row.banque as string | undefined,
    numeroCompte:  row.numero_compte as string | undefined,
    actif:         row.actif as boolean,
    createdAt:     row.created_at as string,
  }
}

export async function fetchFournisseurs(tenantId: string): Promise<Fournisseur[]> {
  const { data, error } = await supabase
    .from('fournisseurs')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('denomination')

  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => mapFournisseur(r as Record<string, unknown>))
}

export async function createFournisseur(
  input: FournisseurInput,
  tenantId: string
): Promise<Fournisseur> {
  const { data, error } = await supabase
    .from('fournisseurs')
    .insert({
      tenant_id:     tenantId,
      code:          input.code,
      denomination:  input.denomination,
      nif:           input.nif ?? null,
      rccm:          input.rccm ?? null,
      telephone:     input.telephone ?? null,
      email:         input.email ?? null,
      adresse:       input.adresse ?? null,
      banque:        input.banque ?? null,
      numero_compte: input.numeroCompte ?? null,
      actif:         input.actif ?? true,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return mapFournisseur(data as Record<string, unknown>)
}

export async function updateFournisseur(
  id: string,
  input: FournisseurInput,
  tenantId: string
): Promise<void> {
  const { error } = await supabase
    .from('fournisseurs')
    .update({
      code:          input.code,
      denomination:  input.denomination,
      nif:           input.nif ?? null,
      rccm:          input.rccm ?? null,
      telephone:     input.telephone ?? null,
      email:         input.email ?? null,
      adresse:       input.adresse ?? null,
      banque:        input.banque ?? null,
      numero_compte: input.numeroCompte ?? null,
      actif:         input.actif ?? true,
    })
    .eq('id', id)
    .eq('tenant_id', tenantId)

  if (error) throw new Error(error.message)
}

// ─── Nomenclatures budgétaires ───────────────────────────────────────────────

import type { NomenclatureBudgetaire } from '@/shared/types'

export async function fetchNomenclatures(tenantId: string): Promise<NomenclatureBudgetaire[]> {
  const { data, error } = await supabase
    .from('nomenclature_budgetaire')
    .select('*')
    .eq('actif', true)
    .or(`tenant_id.is.null,tenant_id.eq.${tenantId}`)
    .order('code_article')

  if (error) throw new Error(error.message)

  return (data ?? []).map((row) => ({
    id:                row.id as string,
    tenantId:          row.tenant_id as string | null,
    codeTitre:         row.code_titre as string,
    libelleTitre:      row.libelle_titre as string,
    codeChapitre:      row.code_chapitre as string,
    libelleChapitre:   row.libelle_chapitre as string,
    codeArticle:       row.code_article as string,
    libelleArticle:    row.libelle_article as string,
    codeParagraphe:    row.code_paragraphe as string | undefined,
    libelleParagraphe: row.libelle_paragraphe as string | undefined,
    typeCredit:        row.type_credit as NomenclatureBudgetaire['typeCredit'],
    actif:             row.actif as boolean,
    createdAt:         row.created_at as string,
  }))
}
