import { supabase } from '@/shared/lib/supabase'
import type { RALEngagement, RAPMandat } from '../types'

// Restes à Liquider : engagements VISE ou LIQUIDE non totalement ordonnancés
export async function fetchRAL(exerciceId: string, tenantId: string): Promise<RALEngagement[]> {
  const { data, error } = await supabase
    .from('engagements_depenses')
    .select(`
      id, numero, objet, fournisseur, montant_engage,
      liquidations(montant_net, statut)
    `)
    .eq('tenant_id', tenantId)
    .eq('exercice_id', exerciceId)
    .in('statut', ['VISE', 'LIQUIDE'])
    .order('date_creation', { ascending: false })

  if (error) throw new Error(error.message)

  return (data ?? []).map((row) => {
    const liqs = (row.liquidations as { montant_net: number; statut: string }[]) ?? []
    const liquidated = liqs
      .filter((l) => l.statut === 'VALIDEE')
      .reduce((s, l) => s + l.montant_net, 0)
    const ral = (row.montant_engage as number) - liquidated
    return {
      id:             row.id as string,
      numero:         row.numero as string,
      objet:          row.objet as string,
      fournisseur:    row.fournisseur as string | undefined,
      montantEngage:  row.montant_engage as number,
      montantLiquide: liquidated,
      ral:            Math.max(0, ral),
    }
  }).filter((r) => r.ral > 0)
}

// Restes à Payer : mandats non encore payés (EMIS, TRANSMIS_TRESOR, PRIS_EN_CHARGE)
export async function fetchRAP(tenantId: string): Promise<RAPMandat[]> {
  const { data, error } = await supabase
    .from('mandats_paiement')
    .select(`
      id, numero, montant, statut, date_emission, beneficiaire,
      liquidation:liquidations(
        numero,
        engagement:engagements_depenses(objet)
      )
    `)
    .eq('tenant_id', tenantId)
    .in('statut', ['EMIS', 'TRANSMIS_TRESOR', 'PRIS_EN_CHARGE'])
    .order('date_emission', { ascending: false })

  if (error) throw new Error(error.message)

  return (data ?? []).map((row) => {
    const liq = row.liquidation as unknown as Record<string, unknown> | null
    const eng = liq ? (liq.engagement as unknown as Record<string, unknown> | null) : null
    return {
      id:                row.id as string,
      numero:            row.numero as string,
      liquidationNumero: liq ? (liq.numero as string) : '—',
      engagementObjet:   eng ? (eng.objet as string) : '—',
      beneficiaire:      row.beneficiaire as string,
      montant:           row.montant as number,
      statut:            row.statut as string,
      dateEmission:      row.date_emission as string,
    }
  })
}
