import { supabase } from '@/shared/lib/supabase'
import type { Bien, BienInput, BienFiltres, BienParCategorie } from '../types'

const SELECT_FULL = `
  *,
  affecte:user_profiles!affecte_a(nom, prenom),
  engagement:engagements_depenses!engagement_id(numero, objet)
`

function mapBien(row: Record<string, unknown>): Bien {
  return {
    id:                row.id as string,
    codeInventaire:    row.code_inventaire as string,
    tenantId:          row.tenant_id as string,
    designation:       row.designation as string,
    categorie:         row.categorie as Bien['categorie'],
    marque:            row.marque as string | undefined,
    modele:            row.modele as string | undefined,
    numeroSerie:       row.numero_serie as string | undefined,
    valeurAcquisition: row.valeur_acquisition as number,
    dateAcquisition:   row.date_acquisition as string,
    engagementId:      row.engagement_id as string | undefined,
    localisation:      row.localisation as string,
    affecteA:          row.affecte_a as string | undefined,
    etat:              row.etat as Bien['etat'],
    actif:             row.actif as boolean,
    sicomId:           row.sicom_id as string | undefined,
    sicomSyncAt:       row.sicom_sync_at as string | undefined,
    observations:      row.observations as string | undefined,
    createdBy:         row.created_by as string,
    createdAt:         row.created_at as string,
    updatedAt:         row.updated_at as string,
    affecte: row.affecte
      ? {
          nom:    (row.affecte as Record<string, unknown>).nom as string,
          prenom: (row.affecte as Record<string, unknown>).prenom as string,
        }
      : undefined,
    engagement: row.engagement
      ? {
          numero: (row.engagement as Record<string, unknown>).numero as string,
          objet:  (row.engagement as Record<string, unknown>).objet as string,
        }
      : undefined,
  }
}

export async function fetchBiens(
  filtres: BienFiltres,
  tenantId: string
): Promise<Bien[]> {
  let q = supabase
    .from('biens')
    .select(SELECT_FULL)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  if (filtres.actif !== undefined) q = q.eq('actif', filtres.actif)
  if (filtres.categorie)           q = q.eq('categorie', filtres.categorie)
  if (filtres.etat)                q = q.eq('etat', filtres.etat)
  if (filtres.affecteA)            q = q.eq('affecte_a', filtres.affecteA)
  if (filtres.search) {
    q = q.or(
      `designation.ilike.%${filtres.search}%,code_inventaire.ilike.%${filtres.search}%,marque.ilike.%${filtres.search}%`
    )
  }

  const { data, error } = await q
  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => mapBien(r as Record<string, unknown>))
}

export async function fetchBien(id: string, tenantId: string): Promise<Bien> {
  const { data, error } = await supabase
    .from('biens')
    .select(SELECT_FULL)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()

  if (error) throw new Error(error.message)
  return mapBien(data as Record<string, unknown>)
}

export async function creerBien(
  input: BienInput,
  tenantId: string,
  userId: string
): Promise<Bien> {
  const { data, error } = await supabase
    .from('biens')
    .insert({
      tenant_id:          tenantId,
      designation:        input.designation,
      categorie:          input.categorie,
      marque:             input.marque ?? null,
      modele:             input.modele ?? null,
      numero_serie:       input.numeroSerie ?? null,
      valeur_acquisition: input.valeurAcquisition,
      date_acquisition:   input.dateAcquisition,
      engagement_id:      input.engagementId ?? null,
      localisation:       input.localisation,
      affecte_a:          input.affecteA ?? null,
      etat:               input.etat,
      observations:       input.observations ?? null,
      created_by:         userId,
    })
    .select(SELECT_FULL)
    .single()

  if (error) throw new Error(error.message)
  return mapBien(data as Record<string, unknown>)
}

export async function modifierBien(
  id: string,
  tenantId: string,
  input: Partial<BienInput>
): Promise<Bien> {
  const payload: Record<string, unknown> = {}
  if (input.designation  !== undefined) payload.designation  = input.designation
  if (input.categorie    !== undefined) payload.categorie    = input.categorie
  if (input.marque       !== undefined) payload.marque       = input.marque ?? null
  if (input.modele       !== undefined) payload.modele       = input.modele ?? null
  if (input.numeroSerie  !== undefined) payload.numero_serie = input.numeroSerie ?? null
  if (input.localisation !== undefined) payload.localisation = input.localisation
  if (input.affecteA     !== undefined) payload.affecte_a    = input.affecteA ?? null
  if (input.etat         !== undefined) payload.etat         = input.etat
  if (input.engagementId !== undefined) payload.engagement_id = input.engagementId ?? null
  if (input.observations !== undefined) payload.observations = input.observations ?? null

  const { data, error } = await supabase
    .from('biens')
    .update(payload)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select(SELECT_FULL)
    .single()

  if (error) throw new Error(error.message)
  return mapBien(data as Record<string, unknown>)
}

export async function reformerBien(
  id: string,
  tenantId: string,
  observations: string
): Promise<void> {
  const { error } = await supabase
    .from('biens')
    .update({ etat: 'REFORME', actif: false, observations })
    .eq('id', id)
    .eq('tenant_id', tenantId)

  if (error) throw new Error(error.message)
}

export async function fetchBiensParCategorie(
  tenantId: string
): Promise<BienParCategorie[]> {
  const { data, error } = await supabase
    .from('biens')
    .select('categorie, valeur_acquisition')
    .eq('tenant_id', tenantId)
    .eq('actif', true)

  if (error) throw new Error(error.message)

  const map = new Map<string, { count: number; valeurTotale: number }>()
  for (const row of data ?? []) {
    const cat = row.categorie as string
    const prev = map.get(cat) ?? { count: 0, valeurTotale: 0 }
    map.set(cat, {
      count:       prev.count + 1,
      valeurTotale: prev.valeurTotale + (row.valeur_acquisition as number),
    })
  }

  return Array.from(map.entries()).map(([categorie, stats]) => ({
    categorie: categorie as BienParCategorie['categorie'],
    ...stats,
  }))
}
