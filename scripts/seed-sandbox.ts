/**
 * Peuplement du tenant SANDBOX avec des données fictives réalistes.
 * Usage : npx tsx scripts/seed-sandbox.ts
 *
 * Prérequis : SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY dans .env.local
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL
const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceKey) {
  console.error('❌ SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis dans .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function getSandboxTenantId(): Promise<string> {
  const { data, error } = await supabase
    .from('tenants')
    .select('id')
    .eq('code', 'SANDBOX')
    .single()

  if (error || !data) {
    throw new Error('Tenant SANDBOX introuvable — appliquez la migration 023 d\'abord.')
  }
  return data.id
}

async function seedExercice(tenantId: string): Promise<string> {
  const { data, error } = await supabase
    .from('exercices_budgetaires')
    .upsert({
      tenant_id: tenantId,
      annee: 2026,
      statut: 'OUVERT',
      date_debut: '2026-01-01',
      date_fin: '2026-12-31',
    }, { onConflict: 'tenant_id,annee' })
    .select('id')
    .single()

  if (error || !data) throw new Error(`Exercice: ${error?.message}`)
  console.log('✅ Exercice 2026 créé')
  return data.id
}

async function seedLignesBudgetaires(tenantId: string, exerciceId: string): Promise<string[]> {
  const lignes = [
    { code: '21-11-01', libelle: '[FORMATION] Personnel — Salaires', credit_initial: 500_000_000 },
    { code: '21-11-02', libelle: '[FORMATION] Personnel — Indemnités', credit_initial: 120_000_000 },
    { code: '22-21-01', libelle: '[FORMATION] Fournitures de bureau', credit_initial: 45_000_000 },
    { code: '22-21-02', libelle: '[FORMATION] Équipements informatiques', credit_initial: 85_000_000 },
    { code: '22-31-01', libelle: '[FORMATION] Carburant et lubrifiants', credit_initial: 30_000_000 },
    { code: '23-11-01', libelle: '[FORMATION] Travaux de construction', credit_initial: 200_000_000 },
    { code: '23-21-01', libelle: '[FORMATION] Acquisition de véhicules', credit_initial: 150_000_000 },
    { code: '24-11-01', libelle: '[FORMATION] Subventions aux EPA', credit_initial: 75_000_000 },
    { code: '25-11-01', libelle: '[FORMATION] Remboursement de dettes', credit_initial: 60_000_000 },
    { code: '26-11-01', libelle: '[FORMATION] Dépenses imprévues', credit_initial: 25_000_000 },
  ]

  const ids: string[] = []
  for (const ligne of lignes) {
    const { data, error } = await supabase
      .from('lignes_budgetaires')
      .upsert({
        tenant_id: tenantId,
        exercice_id: exerciceId,
        ...ligne,
        credit_revise: ligne.credit_initial,
        credit_disponible: ligne.credit_initial,
      }, { onConflict: 'tenant_id,exercice_id,code' })
      .select('id')
      .single()

    if (error || !data) {
      console.warn(`⚠ Ligne ${ligne.code}: ${error?.message}`)
    } else {
      ids.push(data.id)
    }
  }
  console.log(`✅ ${ids.length} lignes budgétaires créées`)
  return ids
}

async function seedFournisseurs(tenantId: string): Promise<string[]> {
  const fournisseurs = [
    { nom: '[FORMATION] Imprimerie Nationale de Guinée', nif: 'NIF-001-FORM', telephone: '+224 620 000 001' },
    { nom: '[FORMATION] Société Guinéenne d\'Informatique', nif: 'NIF-002-FORM', telephone: '+224 620 000 002' },
    { nom: '[FORMATION] BTP Conakry SARL', nif: 'NIF-003-FORM', telephone: '+224 620 000 003' },
    { nom: '[FORMATION] Auto-Guinea Distribution', nif: 'NIF-004-FORM', telephone: '+224 620 000 004' },
    { nom: '[FORMATION] Cabinet Conseil MEFB', nif: 'NIF-005-FORM', telephone: '+224 620 000 005' },
  ]

  const ids: string[] = []
  for (const f of fournisseurs) {
    const { data, error } = await supabase
      .from('fournisseurs')
      .upsert({ tenant_id: tenantId, ...f }, { onConflict: 'tenant_id,nif' })
      .select('id')
      .single()

    if (error || !data) {
      console.warn(`⚠ Fournisseur ${f.nom}: ${error?.message}`)
    } else {
      ids.push(data.id)
    }
  }
  console.log(`✅ ${ids.length} fournisseurs créés`)
  return ids
}

async function seedEngagements(
  tenantId: string,
  exerciceId: string,
  ligneIds: string[],
  fournisseurIds: string[]
): Promise<string[]> {
  const statuts = ['SAISI', 'SOUMIS', 'VISE', 'VISE', 'REJETE', 'VISE', 'VISE', 'SOUMIS', 'VISE', 'SAISI']
  const ids: string[] = []

  for (let i = 0; i < 10; i++) {
    const montant = Math.floor(Math.random() * 20_000_000) + 1_000_000
    const { data, error } = await supabase
      .from('engagements_depenses')
      .insert({
        tenant_id: tenantId,
        exercice_id: exerciceId,
        ligne_budgetaire_id: ligneIds[i % ligneIds.length],
        fournisseur_id: fournisseurIds[i % fournisseurIds.length],
        objet: `[FORMATION] Engagement de test n°${String(i + 1).padStart(3, '0')}`,
        montant_engage: montant,
        statut: statuts[i],
      })
      .select('id')
      .single()

    if (error || !data) {
      console.warn(`⚠ Engagement ${i + 1}: ${error?.message}`)
    } else {
      ids.push(data.id)
    }
  }
  console.log(`✅ ${ids.length} engagements créés`)
  return ids
}

async function seedLiquidations(
  tenantId: string,
  engagementIds: string[]
): Promise<string[]> {
  // Créer des liquidations uniquement sur les engagements VISE
  const visesIds = engagementIds.slice(2, 5) // indices 2,3,4 sont VISE d'après la liste ci-dessus
  const ids: string[] = []

  for (const engId of visesIds) {
    const { data, error } = await supabase
      .from('liquidations')
      .insert({
        tenant_id: tenantId,
        engagement_id: engId,
        montant_net: Math.floor(Math.random() * 10_000_000) + 500_000,
        date_service_fait: '2026-03-15',
        statut: 'VALIDEE',
        observations: '[FORMATION] Liquidation de test',
      })
      .select('id')
      .single()

    if (error || !data) {
      console.warn(`⚠ Liquidation: ${error?.message}`)
    } else {
      ids.push(data.id)
    }
  }
  console.log(`✅ ${ids.length} liquidations créées`)
  return ids
}

async function seedMandats(
  tenantId: string,
  liquidationIds: string[]
): Promise<void> {
  const statuts = ['EMIS', 'REJETE_TRESOR']

  for (let i = 0; i < Math.min(2, liquidationIds.length); i++) {
    const { error } = await supabase
      .from('mandats_paiement')
      .insert({
        tenant_id: tenantId,
        liquidation_id: liquidationIds[i],
        montant: Math.floor(Math.random() * 8_000_000) + 500_000,
        statut: statuts[i % statuts.length],
        observations: `[FORMATION] Mandat de test n°${i + 1}`,
      })

    if (error) console.warn(`⚠ Mandat ${i + 1}: ${error?.message}`)
  }
  console.log('✅ 2 mandats créés (EMIS + REJETE_TRESOR)')
}

async function createFormationUsers(tenantId: string): Promise<void> {
  const users = [
    { email: 'saff@formation.gcap-gn.gn',         role: 'SAFF',         prenom: 'Amadou',  nom: 'Diallo' },
    { email: 'cf@formation.gcap-gn.gn',            role: 'CF',           prenom: 'Fatoumata', nom: 'Bah' },
    { email: 'ordonnateur@formation.gcap-gn.gn',   role: 'ORDONNATEUR',  prenom: 'Ibrahima', nom: 'Camara' },
    { email: 'daff@formation.gcap-gn.gn',          role: 'DAFF',         prenom: 'Mariama', nom: 'Sylla' },
    { email: 'auditeur@formation.gcap-gn.gn',      role: 'AUDITEUR',     prenom: 'Sory',    nom: 'Kouyaté' },
  ]

  console.log('\n📧 Comptes de formation (à créer manuellement via Supabase Auth ou invitation):')
  for (const u of users) {
    console.log(`  ${u.role.padEnd(15)} → ${u.email}  (${u.prenom} ${u.nom})`)
  }
  console.log(`\n  Tous associés au tenant SANDBOX (id: ${tenantId})`)
  console.log('  Mot de passe formation : Formation2026!  (à changer après démonstration)')
}

async function main() {
  console.log('🌱 Seeding du tenant SANDBOX…\n')

  const tenantId = await getSandboxTenantId()
  console.log(`✅ Tenant SANDBOX : ${tenantId}`)

  const exerciceId = await seedExercice(tenantId)
  const ligneIds   = await seedLignesBudgetaires(tenantId, exerciceId)
  const fournIds   = await seedFournisseurs(tenantId)
  const engIds     = await seedEngagements(tenantId, exerciceId, ligneIds, fournIds)
  const liqIds     = await seedLiquidations(tenantId, engIds)
  await seedMandats(tenantId, liqIds)
  await createFormationUsers(tenantId)

  console.log('\n✅ Seed SANDBOX terminé avec succès.')
}

main().catch((err) => {
  console.error('❌ Erreur:', err)
  process.exit(1)
})
