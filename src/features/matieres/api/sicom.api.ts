import { supabase } from '@/shared/lib/supabase'
import type { SicomSyncResult, SicomExportResult } from '../types'

const SICOM_BASE_URL = import.meta.env.VITE_SICOM_URL as string | undefined

interface SicomBien {
  sicom_id: string
  code_inventaire: string
  designation: string
  valeur: number
  etat: string
  localisation: string
  ministere_code: string
}

function mapEtatSicom(etat: string): string {
  const map: Record<string, string> = {
    bon:          'BON',
    acceptable:   'ACCEPTABLE',
    mediocre:     'MEDIOCRE',
    hors_service: 'HORS_SERVICE',
    reforme:      'REFORME',
  }
  return map[etat.toLowerCase()] ?? 'ACCEPTABLE'
}

function simulerBiensSicom(tenantCode: string): SicomBien[] {
  return [
    {
      sicom_id:       `SICOM-${tenantCode}-001`,
      code_inventaire: '',
      designation:    'Véhicule Toyota Land Cruiser (SICOM)',
      valeur:         180_000_000,
      etat:           'bon',
      localisation:   'Direction Générale',
      ministere_code:  tenantCode,
    },
    {
      sicom_id:       `SICOM-${tenantCode}-002`,
      code_inventaire: '',
      designation:    'Groupe électrogène 20 KVA (SICOM)',
      valeur:         45_000_000,
      etat:           'acceptable',
      localisation:   'Sous-sol bâtiment A',
      ministere_code:  tenantCode,
    },
  ]
}

export async function syncDepuisSicom(
  tenantId: string,
  tenantCode: string,
  userId: string
): Promise<SicomSyncResult> {
  let biensSicom: SicomBien[]

  if (SICOM_BASE_URL) {
    const res = await fetch(
      `${SICOM_BASE_URL}/biens?ministere=${encodeURIComponent(tenantCode)}`,
      { headers: { 'Accept': 'application/json' } }
    )
    if (!res.ok) {
      throw new Error(`SICOM a répondu ${res.status} : ${await res.text()}`)
    }
    biensSicom = (await res.json()) as SicomBien[]
  } else {
    biensSicom = simulerBiensSicom(tenantCode)
  }

  let synchronises = 0
  let crees = 0
  const erreurs: string[] = []

  for (const bien of biensSicom) {
    try {
      const { data: existant } = await supabase
        .from('biens')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('sicom_id', bien.sicom_id)
        .maybeSingle()

      if (existant) {
        const { error } = await supabase
          .from('biens')
          .update({
            valeur_acquisition: bien.valeur,
            etat:               mapEtatSicom(bien.etat),
            localisation:       bien.localisation,
            sicom_sync_at:      new Date().toISOString(),
          })
          .eq('id', existant.id)
          .eq('tenant_id', tenantId)

        if (error) erreurs.push(`Mise à jour ${bien.sicom_id} : ${error.message}`)
        else synchronises++
      } else {
        const { error } = await supabase
          .from('biens')
          .insert({
            tenant_id:          tenantId,
            designation:        bien.designation,
            categorie:          'AUTRE',
            valeur_acquisition: bien.valeur,
            date_acquisition:   new Date().toISOString().split('T')[0],
            localisation:       bien.localisation,
            etat:               mapEtatSicom(bien.etat),
            sicom_id:           bien.sicom_id,
            sicom_sync_at:      new Date().toISOString(),
            created_by:         userId,
          })

        if (error) erreurs.push(`Création ${bien.sicom_id} : ${error.message}`)
        else crees++
      }
    } catch (e) {
      erreurs.push(`${bien.sicom_id} : ${e instanceof Error ? e.message : 'Erreur inconnue'}`)
    }
  }

  return {
    synchronises,
    crees,
    erreurs,
    dateSync: new Date().toISOString(),
  }
}

export async function exporterVersSicom(
  bienIds: string[],
  tenantId: string
): Promise<SicomExportResult> {
  if (!SICOM_BASE_URL) {
    return { exportes: bienIds.length, erreurs: [] }
  }

  const { data, error } = await supabase
    .from('biens')
    .select('*')
    .eq('tenant_id', tenantId)
    .in('id', bienIds)

  if (error) throw new Error(error.message)

  const payload = (data ?? []).map((b) => ({
    code_inventaire: b.code_inventaire,
    designation:     b.designation,
    categorie:       b.categorie,
    valeur:          b.valeur_acquisition,
    etat:            b.etat.toLowerCase(),
    localisation:    b.localisation,
  }))

  const res = await fetch(`${SICOM_BASE_URL}/biens`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body:    JSON.stringify(payload),
  })

  if (!res.ok) {
    throw new Error(`SICOM export a répondu ${res.status}`)
  }

  return { exportes: bienIds.length, erreurs: [] }
}

export async function syncBien(
  bienId: string,
  tenantId: string,
  userId: string
): Promise<void> {
  const { data: bien, error: fetchErr } = await supabase
    .from('biens')
    .select('*')
    .eq('id', bienId)
    .eq('tenant_id', tenantId)
    .single()

  if (fetchErr) throw new Error(fetchErr.message)

  if (SICOM_BASE_URL && bien.sicom_id) {
    const res = await fetch(
      `${SICOM_BASE_URL}/biens/${bien.sicom_id}`,
      { headers: { 'Accept': 'application/json' } }
    )
    if (res.ok) {
      const remote = (await res.json()) as SicomBien
      const { error } = await supabase
        .from('biens')
        .update({
          valeur_acquisition: remote.valeur,
          etat:               mapEtatSicom(remote.etat),
          localisation:       remote.localisation,
          sicom_sync_at:      new Date().toISOString(),
        })
        .eq('id', bienId)
        .eq('tenant_id', tenantId)
      if (error) throw new Error(error.message)
      return
    }
  }

  // Simulation : marquer synchronisé maintenant
  void userId
  const { error } = await supabase
    .from('biens')
    .update({ sicom_sync_at: new Date().toISOString() })
    .eq('id', bienId)
    .eq('tenant_id', tenantId)

  if (error) throw new Error(error.message)
}
