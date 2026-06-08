// Peuple la base Supabase de TEST avant les tests E2E
// Usage : npx tsx e2e/fixtures/seed-test-data.ts
//
// IMPORTANT : utiliser exclusivement avec SUPABASE_TEST_URL + SUPABASE_TEST_SERVICE_KEY
// Ne jamais exécuter contre la base de production

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL         = process.env.SUPABASE_TEST_URL         ?? process.env.VITE_SUPABASE_URL ?? ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_TEST_SERVICE_KEY ?? ''

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('SUPABASE_TEST_URL et SUPABASE_TEST_SERVICE_KEY sont requis')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const TENANT_SLUG = 'test-e2e'

async function seed() {
  console.log('Début du seed E2E...')

  // ─── 1. Tenant de test ────────────────────────────────────────────────────
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .upsert({ slug: TENANT_SLUG, nom: 'Ministère Test E2E', actif: true }, { onConflict: 'slug' })
    .select('id')
    .single()

  if (tenantError) throw new Error(`Tenant: ${tenantError.message}`)
  console.log(`Tenant: ${tenant.id}`)

  // ─── 2. Exercice budgétaire actif ─────────────────────────────────────────
  const annee = new Date().getFullYear()
  const { data: exercice, error: exerciceError } = await supabase
    .from('exercices_budgetaires')
    .upsert(
      { tenant_id: tenant.id, annee, statut: 'ACTIF', libelle: `Exercice ${annee} — Test E2E` },
      { onConflict: 'tenant_id,annee' }
    )
    .select('id')
    .single()

  if (exerciceError) throw new Error(`Exercice: ${exerciceError.message}`)
  console.log(`Exercice: ${exercice.id}`)

  // ─── 3. Lignes budgétaires ─────────────────────────────────────────────────
  const lignes = [
    { code_titre: '2', code_chapitre: '21', code_article: '210', libelle: 'Fournitures de bureau', credit_initial: 10_000_000 },
    { code_titre: '2', code_chapitre: '22', code_article: '220', libelle: 'Réhabilitation bâtiments', credit_initial: 50_000_000 },
    { code_titre: '3', code_chapitre: '31', code_article: '310', libelle: 'Formation du personnel', credit_initial: 5_000_000 },
    { code_titre: '1', code_chapitre: '11', code_article: '110', libelle: 'Salaires agents permanents', credit_initial: 100_000_000 },
    { code_titre: '4', code_chapitre: '41', code_article: '410', libelle: 'Équipements informatiques', credit_initial: 20_000_000 },
  ]

  const { data: ligneBudgetaire } = await supabase
    .from('lignes_budgetaires')
    .upsert(
      lignes.map((l) => ({
        tenant_id:       tenant.id,
        exercice_id:     exercice.id,
        ...l,
        credit_revise:   l.credit_initial,
        montant_engage:  0,
        montant_liquide: 0,
        montant_ordonnance: 0,
        type_credit:     'FONCTIONNEMENT',
        taux_consommation: 0,
      })),
      { onConflict: 'tenant_id,exercice_id,code_article' }
    )
    .select('id')

  const premiereLigneId = ligneBudgetaire?.[0]?.id
  console.log(`${lignes.length} lignes budgétaires créées`)

  // ─── 4. Comptes utilisateurs de test ──────────────────────────────────────
  const testUsers = [
    { email: process.env.PLAYWRIGHT_DAFF_EMAIL ?? 'daff-test@e2e.local', role: 'DAFF', nom: 'Diallo', prenom: 'Mamadou' },
    { email: process.env.PLAYWRIGHT_CF_EMAIL   ?? 'cf-test@e2e.local',   role: 'CF',   nom: 'Camara', prenom: 'Fatoumata' },
    { email: process.env.PLAYWRIGHT_ORDONNATEUR_EMAIL ?? 'ord-test@e2e.local', role: 'ORDONNATEUR', nom: 'Bah', prenom: 'Thierno' },
    { email: process.env.PLAYWRIGHT_SAFF_EMAIL ?? 'saff-test@e2e.local', role: 'SAFF', nom: 'Kouyaté', prenom: 'Aissatou' },
    { email: process.env.PLAYWRIGHT_AUDITEUR_EMAIL ?? 'audit-test@e2e.local', role: 'AUDITEUR', nom: 'Sylla', prenom: 'Ibrahima' },
  ]

  for (const u of testUsers) {
    const { data: authUser } = await supabase.auth.admin.createUser({
      email: u.email,
      password: process.env[`PLAYWRIGHT_${u.role}_PASSWORD`] ?? 'Test@GCAP2026!',
      email_confirm: true,
    }).catch(() => ({ data: null }))

    if (authUser?.user) {
      await supabase.from('user_profiles').upsert({
        id: authUser.user.id,
        tenant_id: tenant.id,
        email: u.email,
        nom: u.nom,
        prenom: u.prenom,
        role: u.role,
        actif: true,
      }, { onConflict: 'id' })
    }
  }
  console.log(`${testUsers.length} utilisateurs de test créés/mis à jour`)

  // ─── 5. Engagements à divers stades ───────────────────────────────────────
  if (premiereLigneId) {
    const { data: authUsers } = await supabase.auth.admin.listUsers()
    const daffUser = authUsers?.users.find((u: { email: string }) => u.email === testUsers[0].email)

    if (daffUser) {
      await supabase.from('engagements_depenses').upsert([
        {
          tenant_id: tenant.id, exercice_id: exercice.id,
          ligne_budgetaire_id: premiereLigneId,
          objet: 'Achat fournitures — test EN_ATTENTE_VISA',
          montant_engage: 500_000, statut: 'EN_ATTENTE_VISA',
          numero: 'SEED-001', created_by: daffUser.id,
          date_creation: new Date().toISOString(), metadata: {}, pieces_jointes: [],
        },
        {
          tenant_id: tenant.id, exercice_id: exercice.id,
          ligne_budgetaire_id: premiereLigneId,
          objet: 'Réhabilitation bureau — test VISE',
          montant_engage: 2_000_000, statut: 'VISE',
          numero: 'SEED-002', created_by: daffUser.id,
          date_creation: new Date().toISOString(), metadata: {}, pieces_jointes: [],
        },
        {
          tenant_id: tenant.id, exercice_id: exercice.id,
          ligne_budgetaire_id: premiereLigneId,
          objet: 'Formation — test REJETE',
          montant_engage: 300_000, statut: 'REJETE',
          numero: 'SEED-003', created_by: daffUser.id,
          motif_rejet: 'Documents incomplets',
          date_creation: new Date().toISOString(), metadata: {}, pieces_jointes: [],
        },
      ], { onConflict: 'tenant_id,numero' })

      console.log('3 engagements de test créés')
    }
  }

  console.log('\nSeed E2E terminé avec succès.')
  console.log(`Tenant ID : ${tenant.id}`)
  console.log(`Exercice ID : ${exercice.id}`)
  console.log('Ajouter dans .env.local :')
  console.log(`PLAYWRIGHT_TEST_TENANT_ID=${tenant.id}`)
}

seed().catch((err) => {
  console.error('Erreur seed:', err)
  process.exit(1)
})
