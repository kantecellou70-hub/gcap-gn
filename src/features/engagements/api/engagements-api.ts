import { supabase } from '@/shared/lib/supabase'
import type { Engagement, EngagementFiltres, EngagementInput, VisaInput } from '../types'

function mapEngagement(row: Record<string, unknown>): Engagement {
  const meta = (row.metadata ?? {}) as Record<string, unknown>
  return {
    id:               row.id as string,
    tenantId:         row.tenant_id as string,
    numero:           row.numero as string,
    exerciceId:       row.exercice_id as string,
    ligneBudgetaireId:row.ligne_budgetaire_id as string,
    objet:            row.objet as string,
    fournisseur:      row.fournisseur as string | undefined,
    referenceMarche:  row.reference_marche as string | undefined,
    referenceBonCmd:  meta.reference_bon_cmd as string | undefined,
    dateEcheance:     meta.date_echeance as string | undefined,
    observations:     meta.observations as string | undefined,
    montantEngage:    row.montant_engage as number,
    statut:           row.statut as Engagement['statut'],
    dateCreation:     row.date_creation as string,
    createdBy:        row.created_by as string,
    dateVisaCf:       row.date_visa_cf as string | undefined,
    visePar:          row.vise_par as string | undefined,
    motifRejet:       row.motif_rejet as string | undefined,
    piecesJointes:    (row.pieces_jointes as Engagement['piecesJointes']) ?? [],
    metadata:         meta,
    ligneBudgetaire:  row.ligne_budgetaire
      ? mapLigne(row.ligne_budgetaire as Record<string, unknown>)
      : undefined,
    createur: row.createur
      ? mapProfil(row.createur as Record<string, unknown>)
      : undefined,
    viseur: row.viseur
      ? mapProfil(row.viseur as Record<string, unknown>)
      : undefined,
  }
}

function mapLigne(r: Record<string, unknown>) {
  return {
    id:               r.id as string,
    codeTitre:        r.code_titre as string,
    codeChapitre:     r.code_chapitre as string,
    codeArticle:      r.code_article as string,
    libelle:          r.libelle as string,
    creditRevise:     r.credit_revise as number,
    montantEngage:    r.montant_engage as number,
    creditDisponible: (r.credit_revise as number) - (r.montant_engage as number),
  }
}

function mapProfil(r: Record<string, unknown>) {
  return {
    nom:    r.nom as string,
    prenom: r.prenom as string,
    poste:  r.poste as string | undefined,
  }
}

const SELECT_FULL = `
  *,
  ligne_budgetaire:lignes_budgetaires(
    id, code_titre, code_chapitre, code_article, libelle, credit_revise, montant_engage
  ),
  createur:user_profiles!created_by(nom, prenom, poste),
  viseur:user_profiles!vise_par(nom, prenom, poste)
`

export async function fetchEngagements(
  filtres: EngagementFiltres,
  tenantId: string
): Promise<Engagement[]> {
  let q = supabase
    .from('engagements_depenses')
    .select(SELECT_FULL)
    .eq('tenant_id', tenantId)
    .order('date_creation', { ascending: false })

  if (filtres.statut)     q = q.eq('statut', filtres.statut)
  if (filtres.exerciceId) q = q.eq('exercice_id', filtres.exerciceId)
  if (filtres.search)     q = q.ilike('objet', `%${filtres.search}%`)

  const { data, error } = await q
  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => mapEngagement(r as Record<string, unknown>))
}

export async function fetchEngagement(id: string, tenantId: string): Promise<Engagement> {
  const { data, error } = await supabase
    .from('engagements_depenses')
    .select(SELECT_FULL)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()

  if (error) throw new Error(error.message)
  return mapEngagement(data as Record<string, unknown>)
}

export async function fetchEngagementsEnAttenteVisa(tenantId: string): Promise<Engagement[]> {
  const { data, error } = await supabase
    .from('engagements_depenses')
    .select(SELECT_FULL)
    .eq('tenant_id', tenantId)
    .eq('statut', 'EN_ATTENTE_VISA')
    .order('date_creation', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => mapEngagement(r as Record<string, unknown>))
}

export async function createEngagement(
  input: EngagementInput,
  tenantId: string,
  userId: string,
  statut: 'BROUILLON' | 'EN_ATTENTE_VISA' = 'BROUILLON'
): Promise<Engagement> {
  const { data, error } = await supabase
    .from('engagements_depenses')
    .insert({
      tenant_id:          tenantId,
      exercice_id:        input.exerciceId,
      ligne_budgetaire_id:input.ligneBudgetaireId,
      objet:              input.objet,
      fournisseur:        input.fournisseur ?? null,
      reference_marche:   input.referenceMarche ?? null,
      montant_engage:     input.montantEngage,
      statut,
      created_by:         userId,
      numero:             '',
      metadata: {
        reference_bon_cmd: input.referenceBonCmd,
        date_echeance:     input.dateEcheance,
        observations:      input.observations,
      },
    })
    .select(SELECT_FULL)
    .single()

  if (error) throw new Error(error.message)
  return mapEngagement(data as Record<string, unknown>)
}

export async function updateStatutEngagement(
  id: string,
  statut: Engagement['statut'],
  tenantId: string,
  extra?: { motifRejet?: string; visePar?: string }
): Promise<void> {
  const patch: Record<string, unknown> = { statut }
  if (extra?.motifRejet) patch.motif_rejet = extra.motifRejet
  if (extra?.visePar)    patch.vise_par = extra.visePar
  if (statut === 'VISE' || statut === 'REJETE') patch.date_visa_cf = new Date().toISOString()

  const { error } = await supabase
    .from('engagements_depenses')
    .update(patch)
    .eq('id', id)
    .eq('tenant_id', tenantId)

  if (error) throw new Error(error.message)
}

export async function visaEngagement(input: VisaInput, tenantId: string, userId: string): Promise<void> {
  return updateStatutEngagement(input.engagementId, input.decision, tenantId, {
    motifRejet: input.motifRejet,
    visePar: userId,
  })
}

// ─── Pièces jointes ───────────────────────────────────────────────────────────

export async function uploadPieceJointe(
  engagementId: string,
  tenantId: string,
  file: File,
  piecesActuelles: Engagement['piecesJointes']
): Promise<Engagement['piecesJointes']> {
  const ext  = file.name.split('.').pop() ?? 'bin'
  const path = `${tenantId}/${engagementId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}.${ext}`
    .replace(/\.{2,}/g, '.')

  const { error: uploadError } = await supabase.storage
    .from('engagements')
    .upload(path, file, { upsert: false })

  if (uploadError) throw new Error(uploadError.message)

  const { data: urlData } = supabase.storage.from('engagements').getPublicUrl(path)

  const nouvelle = {
    nom:        file.name,
    url:        urlData.publicUrl,
    taille:     file.size,
    type:       file.type,
    uploadedAt: new Date().toISOString(),
  }

  const updated = [...piecesActuelles, nouvelle]

  const { error: updateError } = await supabase
    .from('engagements_depenses')
    .update({ pieces_jointes: updated })
    .eq('id', engagementId)
    .eq('tenant_id', tenantId)

  if (updateError) {
    await supabase.storage.from('engagements').remove([path])
    throw new Error(updateError.message)
  }

  return updated
}

export async function supprimerPieceJointe(
  engagementId: string,
  tenantId: string,
  pieceUrl: string,
  piecesActuelles: Engagement['piecesJointes']
): Promise<Engagement['piecesJointes']> {
  const url   = new URL(pieceUrl)
  const parts = url.pathname.split('/object/public/engagements/')
  const path  = parts[1] ?? ''

  if (path) {
    await supabase.storage.from('engagements').remove([path])
  }

  const updated = piecesActuelles.filter((p) => p.url !== pieceUrl)

  const { error } = await supabase
    .from('engagements_depenses')
    .update({ pieces_jointes: updated })
    .eq('id', engagementId)
    .eq('tenant_id', tenantId)

  if (error) throw new Error(error.message)
  return updated
}
