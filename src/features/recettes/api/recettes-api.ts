import { supabase } from '@/shared/lib/supabase'
import type { Recette, RecetteInput, RecetteFiltres, StatutRecette } from '../types'

const SELECT_FULL = `
  *,
  createur:user_profiles!created_by(nom, prenom)
`

function mapRecette(row: Record<string, unknown>): Recette {
  return {
    id:                 row.id as string,
    tenantId:           row.tenant_id as string,
    exerciceId:         row.exercice_id as string,
    ligneBudgetaireId:  row.ligne_budgetaire_id as string | undefined,
    numero:             row.numero as string,
    typeRecette:        row.type_recette as Recette['typeRecette'],
    libelle:            row.libelle as string,
    montantPrevu:       row.montant_prevu as number,
    montantConstate:    row.montant_constate as number,
    montantRecouvre:    row.montant_recouvre as number,
    debiteur:           row.debiteur as string,
    dateConstatation:   row.date_constatation as string | undefined,
    observations:       row.observations as string | undefined,
    statut:             row.statut as Recette['statut'],
    createdBy:          row.created_by as string | undefined,
    createdAt:          row.created_at as string,
    createur: row.createur ? {
      nom:    (row.createur as Record<string, unknown>).nom as string,
      prenom: (row.createur as Record<string, unknown>).prenom as string,
    } : undefined,
  }
}

export async function fetchRecettes(
  filtres: RecetteFiltres,
  tenantId: string
): Promise<Recette[]> {
  let q = supabase
    .from('recettes')
    .select(SELECT_FULL)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  if (filtres.statut)      q = q.eq('statut', filtres.statut)
  if (filtres.typeRecette) q = q.eq('type_recette', filtres.typeRecette)
  if (filtres.search)      q = q.ilike('libelle', `%${filtres.search}%`)

  const { data, error } = await q
  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => mapRecette(r as Record<string, unknown>))
}

export async function fetchRecette(id: string, tenantId: string): Promise<Recette> {
  const { data, error } = await supabase
    .from('recettes')
    .select(SELECT_FULL)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()

  if (error) throw new Error(error.message)
  return mapRecette(data as Record<string, unknown>)
}

export async function createRecette(
  input: RecetteInput,
  tenantId: string,
  userId: string
): Promise<Recette> {
  const { data, error } = await supabase
    .from('recettes')
    .insert({
      tenant_id:           tenantId,
      exercice_id:         input.exerciceId,
      ligne_budgetaire_id: input.ligneBudgetaireId ?? null,
      numero:              '',
      type_recette:        input.typeRecette,
      libelle:             input.libelle,
      montant_prevu:       input.montantPrevu,
      debiteur:            input.debiteur,
      date_constatation:   input.dateConstatation ?? null,
      observations:        input.observations ?? null,
      statut:              'PREVUE',
      created_by:          userId,
    })
    .select(SELECT_FULL)
    .single()

  if (error) throw new Error(error.message)
  return mapRecette(data as Record<string, unknown>)
}

export async function constaterRecette(
  id: string,
  tenantId: string,
  montantConstate: number,
  dateConstatation: string
): Promise<void> {
  const { error } = await supabase
    .from('recettes')
    .update({
      statut:            'CONSTATEE',
      montant_constate:  montantConstate,
      date_constatation: dateConstatation,
    })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .eq('statut', 'PREVUE')

  if (error) throw new Error(error.message)
}

export async function recouvrerRecette(
  id: string,
  tenantId: string,
  montantRecouvre: number
): Promise<void> {
  const { error } = await supabase
    .from('recettes')
    .update({ statut: 'RECOUVREE', montant_recouvre: montantRecouvre })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .eq('statut', 'CONSTATEE')

  if (error) throw new Error(error.message)
}

export async function annulerRecette(id: string, tenantId: string): Promise<void> {
  const { error } = await supabase
    .from('recettes')
    .update({ statut: 'ANNULEE' as StatutRecette })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .in('statut', ['PREVUE', 'CONSTATEE'])

  if (error) throw new Error(error.message)
}
