import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL     = process.env.VITE_SUPABASE_URL     ?? ''
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY ?? ''
const TENANT_ID        = process.env.PLAYWRIGHT_TEST_TENANT_ID ?? ''

// Timeout étendu pour les tests de charge
test.setTimeout(60_000)

test.describe('Charge — 50 agents simultanés', () => {
  test.skip(!SUPABASE_URL || !TENANT_ID, 'VITE_SUPABASE_URL ou PLAYWRIGHT_TEST_TENANT_ID non défini')

  test('50 lectures simultanées du budget ne génèrent pas d\'erreur', async () => {
    const AGENTS = 50

    // Créer 50 clients Supabase indépendants
    const clients = Array.from({ length: AGENTS }, () =>
      createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    )

    // Authentifier tous les clients en parallèle
    await Promise.all(
      clients.map((client) =>
        client.auth.signInWithPassword({
          email:    process.env.PLAYWRIGHT_DAFF_EMAIL    ?? '',
          password: process.env.PLAYWRIGHT_DAFF_PASSWORD ?? '',
        })
      )
    )

    const start = Date.now()

    // 50 lectures simultanées des lignes budgétaires
    const results = await Promise.all(
      clients.map((client) =>
        client
          .from('lignes_budgetaires')
          .select('id, credit_revise, montant_engage')
          .eq('tenant_id', TENANT_ID)
          .limit(10)
      )
    )

    const elapsed = Date.now() - start

    // Aucune requête ne doit échouer
    const errors = results.filter((r) => r.error !== null)
    expect(errors).toHaveLength(0)

    // Toutes les lectures en < 10 secondes (pool de 50)
    expect(elapsed).toBeLessThan(10_000)

    // Déconnecter tous les clients
    await Promise.all(clients.map((c) => c.auth.signOut()))
  })

  test('10 engagements créés simultanément : pas d\'UUID collision', async () => {
    const AGENTS = 10

    const clients = Array.from({ length: AGENTS }, () =>
      createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    )

    await Promise.all(
      clients.map((client) =>
        client.auth.signInWithPassword({
          email:    process.env.PLAYWRIGHT_DAFF_EMAIL    ?? '',
          password: process.env.PLAYWRIGHT_DAFF_PASSWORD ?? '',
        })
      )
    )

    // Créer 10 engagements en parallèle
    const inserts = await Promise.all(
      clients.map((client, idx) =>
        client
          .from('engagements_depenses')
          .insert({
            tenant_id:           TENANT_ID,
            objet:               `Test charge ${idx + 1}`,
            montant_engage:      100_000,
            statut:              'BROUILLON',
            numero:              '',
            exercice_id:         process.env.PLAYWRIGHT_TEST_EXERCICE_ID ?? '',
            ligne_budgetaire_id: process.env.PLAYWRIGHT_TEST_LIGNE_ID    ?? '',
            created_by:          'test-load',
            date_creation:       new Date().toISOString(),
            metadata:            {},
            pieces_jointes:      [],
          })
          .select('id')
          .single()
      )
    )

    const errors = inserts.filter((r) => r.error !== null)
    const created = inserts.filter((r) => r.data !== null).map((r) => r.data!.id as string)

    // Aucun doublon d'UUID
    const uniqueIds = new Set(created)
    expect(uniqueIds.size).toBe(created.length)

    // Nettoyer les données de test
    if (created.length > 0) {
      await clients[0]
        .from('engagements_depenses')
        .delete()
        .in('id', created)
        .eq('tenant_id', TENANT_ID)
    }

    await Promise.all(clients.map((c) => c.auth.signOut()))

    // Tolérer max 1 erreur (race condition réseau non liée au code)
    expect(errors.length).toBeLessThanOrEqual(1)
  })

  test('50 connexions simultanées ne dépassent pas le rate limiter Supabase', async () => {
    const AGENTS = 50
    const start  = Date.now()

    const signIns = await Promise.allSettled(
      Array.from({ length: AGENTS }, () =>
        createClient(SUPABASE_URL, SUPABASE_ANON_KEY).auth.signInWithPassword({
          email:    process.env.PLAYWRIGHT_DAFF_EMAIL    ?? '',
          password: process.env.PLAYWRIGHT_DAFF_PASSWORD ?? '',
        })
      )
    )

    const elapsed  = Date.now() - start
    const rejected = signIns.filter((r) => r.status === 'rejected')
    const failed   = signIns
      .filter((r) => r.status === 'fulfilled')
      .filter((r) => (r as PromiseFulfilledResult<{ error: unknown }>).value.error !== null)

    // Toutes les connexions réussies ou au max 5% d'erreurs réseau tolérées
    const totalFailed = rejected.length + failed.length
    expect(totalFailed).toBeLessThanOrEqual(Math.ceil(AGENTS * 0.05))

    // Les 50 connexions doivent se faire en < 30 secondes
    expect(elapsed).toBeLessThan(30_000)
  })
})
