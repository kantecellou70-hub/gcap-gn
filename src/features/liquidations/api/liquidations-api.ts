import { supabase } from '@/shared/lib/supabase'
import { LIQUIDATION_LIST_SELECT, LIQUIDATION_DETAIL_SELECT } from '@/shared/lib/supabaseSelects'
import type { Liquidation, LiquidationInput, LiquidationFiltres, EngagementVise } from '../types'

const SELECT_FULL = LIQUIDATION_DETAIL_SELECT

function mapLiquidation(row: Record<string, unknown>): Liquidation {
  const eng = row.engagement as Record<string, unknown> | null
  const lb  = eng ? (eng.ligne_budgetaire as Record<string, unknown> | null) : null

  const retenuSource   = (row.retenue_source as number) ?? 0
  const penaliteRetard = (row.penalite_retard as number) ?? 0
  const avanceRec      = (row.avance_recuperee as number) ?? 0

  return {
    id:               row.id as string,
    tenantId:         row.tenant_id as string,
    engagementId:     row.engagement_id as string,
    numero:           row.numero as string,
    montantBrut:      row.montant_liquide as number,   // montant_liquide = brut
    retenuSource,
    penaliteRetard,
    avanceRecuperee:  avanceRec,
    montantDeductions:retenuSource + penaliteRetard + avanceRec,
    montantNet:       row.montant_net as number,
    dateServiceFait:  row.date_service_fait as string,
    referencePvsf:    (row.reference_pvsf as string) ?? '',
    dateFacture:      row.date_facture as string | undefined,
    numeroFacture:    row.numero_facture as string | undefined,
    statut:           row.statut as Liquidation['statut'],
    motifRejet:       row.motif_rejet as string | undefined,
    createdBy:        row.created_by as string,
    createdAt:        row.created_at as string,
    validatedBy:      row.validated_by as string | undefined,
    piecesJointes:    (row.pieces_jointes as Liquidation['piecesJointes']) ?? [],
    engagement: eng ? {
      numero:        eng.numero as string,
      objet:         eng.objet as string,
      fournisseur:   eng.fournisseur as string | undefined,
      montantEngage: eng.montant_engage as number,
      ligneBudgetaire: lb ? {
        codeChapitre: lb.code_chapitre as string,
        libelle:      lb.libelle as string,
      } : undefined,
    } : undefined,
    createur: row.createur
      ? { nom: (row.createur as Record<string, unknown>).nom as string, prenom: (row.createur as Record<string, unknown>).prenom as string }
      : undefined,
    valideur: row.valideur
      ? { nom: (row.valideur as Record<string, unknown>).nom as string, prenom: (row.valideur as Record<string, unknown>).prenom as string }
      : undefined,
  }
}

export async function fetchLiquidations(
  filtres: LiquidationFiltres,
  tenantId: string
): Promise<Liquidation[]> {
  let q = supabase
    .from('liquidations')
    .select(SELECT_FULL)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  if (filtres.statut)      q = q.eq('statut', filtres.statut)
  if (filtres.engagementId)q = q.eq('engagement_id', filtres.engagementId)
  if (filtres.search)      q = q.or(`numero.ilike.%${filtres.search}%,reference_pvsf.ilike.%${filtres.search}%`)

  const { data, error } = await q
  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => mapLiquidation(r as Record<string, unknown>))
}

export async function fetchLiquidationsPaginated(
  filtres: LiquidationFiltres,
  tenantId: string,
  page: number,
  pageSize: number
): Promise<{ data: Liquidation[]; count: number }> {
  let q = supabase
    .from('liquidations')
    .select(LIQUIDATION_LIST_SELECT, { count: 'exact' })
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1)

  if (filtres.statut)       q = q.eq('statut', filtres.statut)
  if (filtres.engagementId) q = q.eq('engagement_id', filtres.engagementId)
  if (filtres.search)       q = q.or(`numero.ilike.%${filtres.search}%,reference_pvsf.ilike.%${filtres.search}%`)

  const { data, error, count } = await q
  if (error) throw new Error(error.message)
  return {
    data:  (data ?? []).map((r) => mapLiquidation(r as Record<string, unknown>)),
    count: count ?? 0,
  }
}

export async function fetchLiquidation(id: string, tenantId: string): Promise<Liquidation> {
  const { data, error } = await supabase
    .from('liquidations')
    .select(SELECT_FULL)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()

  if (error) throw new Error(error.message)
  return mapLiquidation(data as Record<string, unknown>)
}

export async function fetchLiquidationsByEngagement(
  engagementId: string,
  tenantId: string
): Promise<Liquidation[]> {
  const { data, error } = await supabase
    .from('liquidations')
    .select(SELECT_FULL)
    .eq('tenant_id', tenantId)
    .eq('engagement_id', engagementId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => mapLiquidation(r as Record<string, unknown>))
}

export async function fetchEngagementsVises(tenantId: string): Promise<EngagementVise[]> {
  // Engagements VISE + total déjà liquidé (liquidations VALIDEE)
  const { data, error } = await supabase
    .from('engagements_depenses')
    .select(`
      id, numero, objet, fournisseur, montant_engage,
      liquidations(montant_net, statut)
    `)
    .eq('tenant_id', tenantId)
    .eq('statut', 'VISE')
    .order('date_creation', { ascending: false })

  if (error) throw new Error(error.message)

  return (data ?? []).map((r) => {
    const liqs = (r.liquidations as { montant_net: number; statut: string }[]) ?? []
    const dejaLiquide = liqs
      .filter((l) => l.statut === 'VALIDEE')
      .reduce((s, l) => s + l.montant_net, 0)
    const montantEngage = r.montant_engage as number
    return {
      id:             r.id as string,
      numero:         r.numero as string,
      objet:          r.objet as string,
      fournisseur:    r.fournisseur as string | undefined,
      montantEngage,
      dejaLiquide,
      resteALiquider: Math.max(0, montantEngage - dejaLiquide),
    }
  }).filter((e) => e.resteALiquider > 0)
}

export async function createLiquidation(
  input: LiquidationInput,
  tenantId: string,
  userId: string,
  statut: 'BROUILLON' | 'SOUMISE' = 'BROUILLON'
): Promise<Liquidation> {
  const montantNet = input.montantBrut
    - input.retenuSource
    - input.penaliteRetard
    - input.avanceRecuperee

  if (montantNet <= 0) throw new Error('Le montant net doit être positif')

  const { data, error } = await supabase
    .from('liquidations')
    .insert({
      tenant_id:          tenantId,
      engagement_id:      input.engagementId,
      numero:             '',
      montant_liquide:    input.montantBrut,    // colonne DB = montant brut
      retenue_source:     input.retenuSource,
      penalite_retard:    input.penaliteRetard,
      avance_recuperee:   input.avanceRecuperee,
      montant_deductions: input.retenuSource + input.penaliteRetard + input.avanceRecuperee,
      montant_net:        montantNet,
      date_service_fait:  input.dateServiceFait,
      reference_pvsf:     input.referencePvsf,
      date_facture:       input.dateFacture ?? null,
      numero_facture:     input.numeroFacture ?? null,
      statut,
      created_by:         userId,
    })
    .select(SELECT_FULL)
    .single()

  if (error) throw new Error(error.message)
  return mapLiquidation(data as Record<string, unknown>)
}

export async function soumettreeLiquidation(id: string, tenantId: string): Promise<void> {
  const { error } = await supabase
    .from('liquidations')
    .update({ statut: 'SOUMISE' })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .eq('statut', 'BROUILLON')

  if (error) throw new Error(error.message)
}

export async function validerLiquidation(
  id: string,
  tenantId: string,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from('liquidations')
    .update({ statut: 'VALIDEE', validated_by: userId })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .eq('statut', 'SOUMISE')

  if (error) throw new Error(error.message)
}

export async function rejeterLiquidation(
  id: string,
  tenantId: string,
  motif: string
): Promise<void> {
  const { error } = await supabase
    .from('liquidations')
    .update({ statut: 'REJETEE', motif_rejet: motif })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .eq('statut', 'SOUMISE')

  if (error) throw new Error(error.message)
}

export async function annulerLiquidation(id: string, tenantId: string): Promise<void> {
  const { error } = await supabase
    .from('liquidations')
    .update({ statut: 'ANNULEE' })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .in('statut', ['BROUILLON', 'SOUMISE', 'REJETEE'])

  if (error) throw new Error(error.message)
}
