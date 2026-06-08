import { supabase } from '@/shared/lib/supabase'
import { MANDAT_LIST_SELECT } from '@/shared/lib/supabaseSelects'
import type {
  MandatPaiement, MandatInput, MandatFiltres,
  LiquidationValidee, EnregistrerPaiementInput,
} from '../types'
import type { StatutMandat } from '@/shared/types'

// SELECT complet pour les vues détail (inclut les champs optionnels)
const SELECT_FULL = `
  *,
  liquidation:liquidations(
    id, numero, montant_net,
    engagement:engagements_depenses(id, numero, objet, fournisseur, montant_engage)
  ),
  emetteur:user_profiles!emis_par(nom, prenom, poste)
`

function mapMandat(row: Record<string, unknown>): MandatPaiement {
  const liq = row.liquidation as Record<string, unknown> | null
  const eng = liq ? (liq.engagement as Record<string, unknown> | null) : null
  return {
    id:                        row.id as string,
    tenantId:                  row.tenant_id as string,
    liquidationId:             row.liquidation_id as string,
    engagementId:              row.engagement_id as string | undefined,
    numero:                    row.numero as string,
    montant:                   row.montant as number,
    modePaiement:              row.mode_paiement as MandatPaiement['modePaiement'],
    beneficiaire:              row.beneficiaire as string,
    rib:                       row.rib as string | undefined,
    banqueBeneficiaire:        row.banque_beneficiaire as string | undefined,
    numeroCompteBeneficiaire:  row.numero_compte_beneficiaire as string | undefined,
    observations:              row.observations as string | undefined,
    statut:                    row.statut as StatutMandat,
    dateEmission:              row.date_emission as string,
    emisPar:                   row.emis_par as string,
    dateTransmissionTresor:    row.date_transmission_tresor as string | undefined,
    datePaiement:              row.date_paiement as string | undefined,
    referenceTresor:           row.reference_tresor as string | undefined,
    motifRejetTresor:          row.motif_rejet_tresor as string | undefined,
    liquidation: liq ? {
      id:         liq.id as string,
      numero:     liq.numero as string,
      montantNet: liq.montant_net as number,
      engagement: eng ? {
        id:            eng.id as string,
        numero:        eng.numero as string,
        objet:         eng.objet as string,
        fournisseur:   eng.fournisseur as string | undefined,
        montantEngage: eng.montant_engage as number,
      } : undefined,
    } : undefined,
    emetteur: row.emetteur ? {
      nom:    (row.emetteur as Record<string, unknown>).nom as string,
      prenom: (row.emetteur as Record<string, unknown>).prenom as string,
      poste:  (row.emetteur as Record<string, unknown>).poste as string | undefined,
    } : undefined,
  }
}

export async function fetchMandats(filtres: MandatFiltres, tenantId: string): Promise<MandatPaiement[]> {
  let q = supabase
    .from('mandats_paiement')
    .select(SELECT_FULL)
    .eq('tenant_id', tenantId)
    .order('date_emission', { ascending: false })

  if (filtres.statut) q = q.eq('statut', filtres.statut)
  if (filtres.search) q = q.ilike('numero', `%${filtres.search}%`)

  const { data, error } = await q
  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => mapMandat(r as Record<string, unknown>))
}

export async function fetchMandatsPaginated(
  filtres: MandatFiltres,
  tenantId: string,
  page: number,
  pageSize: number
): Promise<{ data: MandatPaiement[]; count: number }> {
  let q = supabase
    .from('mandats_paiement')
    .select(MANDAT_LIST_SELECT, { count: 'exact' })
    .eq('tenant_id', tenantId)
    .order('date_emission', { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1)

  if (filtres.statut) q = q.eq('statut', filtres.statut)
  if (filtres.search) q = q.ilike('numero', `%${filtres.search}%`)

  const { data, error, count } = await q
  if (error) throw new Error(error.message)
  return {
    data:  (data ?? []).map((r) => mapMandat(r as Record<string, unknown>)),
    count: count ?? 0,
  }
}

export async function fetchMandat(id: string, tenantId: string): Promise<MandatPaiement> {
  const { data, error } = await supabase
    .from('mandats_paiement')
    .select(SELECT_FULL)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()

  if (error) throw new Error(error.message)
  return mapMandat(data as Record<string, unknown>)
}

export async function fetchLiquidationsValidees(tenantId: string): Promise<LiquidationValidee[]> {
  // Liquidations VALIDEES sans mandat actif (EMIS/TRANSMIS)
  const { data, error } = await supabase
    .from('liquidations')
    .select(`
      id, numero, montant_net,
      engagement:engagements_depenses(id, numero, objet, fournisseur)
    `)
    .eq('tenant_id', tenantId)
    .eq('statut', 'VALIDEE')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  const liquidationIds = (data ?? []).map((l) => l.id as string)
  if (liquidationIds.length === 0) return []

  // Exclure celles qui ont déjà un mandat non-annulé/non-rejeté
  const { data: existingMandats } = await supabase
    .from('mandats_paiement')
    .select('liquidation_id')
    .eq('tenant_id', tenantId)
    .in('liquidation_id', liquidationIds)
    .not('statut', 'in', '("ANNULE","REJETE","REJETE_TRESOR")')

  const occupees = new Set((existingMandats ?? []).map((m) => m.liquidation_id as string))

  return (data ?? [])
    .filter((l) => !occupees.has(l.id as string))
    .map((l) => {
      const eng = l.engagement as unknown as Record<string, unknown> | null
      return {
        id:         l.id as string,
        numero:     l.numero as string,
        montantNet: l.montant_net as number,
        engagement: eng ? {
          id:          eng.id as string,
          numero:      eng.numero as string,
          objet:       eng.objet as string,
          fournisseur: eng.fournisseur as string | undefined,
        } : undefined,
      }
    })
}

export async function emettreMandatPaiement(
  input: MandatInput,
  tenantId: string,
  userId: string
): Promise<MandatPaiement> {
  const { data, error } = await supabase
    .from('mandats_paiement')
    .insert({
      tenant_id:                  tenantId,
      liquidation_id:             input.liquidationId,
      numero:                     '',
      montant:                    input.montant,
      mode_paiement:              input.modePaiement,
      beneficiaire:               input.beneficiaire,
      rib:                        input.rib ?? null,
      banque_beneficiaire:        input.banqueBeneficiaire ?? null,
      numero_compte_beneficiaire: input.numeroCompteBeneficiaire ?? null,
      observations:               input.observations ?? null,
      statut:                     'EMIS',
      emis_par:                   userId,
    })
    .select(SELECT_FULL)
    .single()

  if (error) throw new Error(error.message)
  return mapMandat(data as Record<string, unknown>)
}

export async function transmettreAuTresor(id: string, tenantId: string): Promise<void> {
  const { error } = await supabase
    .from('mandats_paiement')
    .update({ statut: 'TRANSMIS_TRESOR', date_transmission_tresor: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .eq('statut', 'EMIS')

  if (error) throw new Error(error.message)
}

export async function enregistrerPaiement(
  id: string,
  tenantId: string,
  input: EnregistrerPaiementInput
): Promise<void> {
  const { error } = await supabase
    .from('mandats_paiement')
    .update({
      statut:           'PAYE',
      date_paiement:    input.datePaiement,
      reference_tresor: input.referenceTresor,
    })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .in('statut', ['TRANSMIS_TRESOR', 'PRIS_EN_CHARGE'])

  if (error) throw new Error(error.message)
}

export async function rejeterParTresor(
  id: string,
  tenantId: string,
  motif: string
): Promise<void> {
  const { error } = await supabase
    .from('mandats_paiement')
    .update({ statut: 'REJETE_TRESOR', motif_rejet_tresor: motif })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .in('statut', ['TRANSMIS_TRESOR', 'PRIS_EN_CHARGE'])

  if (error) throw new Error(error.message)
}

export async function annulerMandat(id: string, tenantId: string): Promise<void> {
  const { error } = await supabase
    .from('mandats_paiement')
    .update({ statut: 'ANNULE' })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .eq('statut', 'EMIS')

  if (error) throw new Error(error.message)
}
