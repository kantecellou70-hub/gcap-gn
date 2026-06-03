import { supabase } from '@/shared/lib/supabase'
import type { ExerciceBudgetaire } from '@/shared/types'
import type { LigneBudgetaire, LigneBudgetaireInput, ModifCredit } from '../types'

function mapLigne(row: Record<string, unknown>): LigneBudgetaire {
  return {
    id:               row.id as string,
    tenantId:         row.tenant_id as string,
    exerciceId:       row.exercice_id as string,
    exerciceAnnee:    row.exercice_annee as number,
    exerciceStatut:   row.exercice_statut as string,
    codeTitre:        row.code_titre as string,
    codeChapitre:     row.code_chapitre as string,
    codeArticle:      row.code_article as string,
    codeParagraphe:   row.code_paragraphe as string | undefined,
    libelle:          row.libelle as string,
    typeCredit:       row.type_credit as LigneBudgetaire['typeCredit'],
    creditInitial:    row.credit_initial as number,
    creditRevise:     row.credit_revise as number,
    montantEngage:    row.montant_engage as number,
    montantLiquide:   row.montant_liquide as number,
    montantOrdonnance:row.montant_ordonnance as number,
    creditDisponible: row.credit_disponible as number,
    tauxConsommation: row.taux_consommation as number,
    createdAt:        row.created_at as string,
  }
}

export async function fetchLignesBudgetaires(
  exerciceId: string,
  tenantId: string
): Promise<LigneBudgetaire[]> {
  const { data, error } = await supabase
    .from('vue_credits_disponibles')
    .select('*')
    .eq('exercice_id', exerciceId)
    .eq('tenant_id', tenantId)
    .order('code_chapitre')
    .order('code_article')

  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => mapLigne(r as Record<string, unknown>))
}

export async function fetchLigneBudgetaire(
  id: string,
  tenantId: string
): Promise<LigneBudgetaire> {
  const { data, error } = await supabase
    .from('vue_credits_disponibles')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()

  if (error) throw new Error(error.message)
  return mapLigne(data as Record<string, unknown>)
}

export async function fetchExercices(tenantId: string): Promise<ExerciceBudgetaire[]> {
  const { data, error } = await supabase
    .from('exercices_budgetaires')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('annee', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => ({
    id:            r.id,
    tenantId:      r.tenant_id,
    annee:         r.annee,
    statut:        r.statut,
    dateOuverture: r.date_ouverture,
    dateCloture:   r.date_cloture ?? undefined,
  }))
}

export async function createLigneBudgetaire(
  input: LigneBudgetaireInput,
  tenantId: string
): Promise<void> {
  const { error } = await supabase.from('lignes_budgetaires').insert({
    tenant_id:      tenantId,
    exercice_id:    input.exerciceId,
    code_titre:     input.codeTitre,
    code_chapitre:  input.codeChapitre,
    code_article:   input.codeArticle,
    code_paragraphe:input.codeParagraphe ?? null,
    libelle:        input.libelle,
    type_credit:    input.typeCredit,
    credit_initial: input.creditInitial,
    credit_revise:  input.creditInitial,
  })
  if (error) throw new Error(error.message)
}

export async function modifierCredit(
  params: ModifCredit,
  tenantId: string
): Promise<void> {
  const { error } = await supabase
    .from('lignes_budgetaires')
    .update({ credit_revise: params.creditRevise })
    .eq('id', params.ligneId)
    .eq('tenant_id', tenantId)

  if (error) throw new Error(error.message)
}
