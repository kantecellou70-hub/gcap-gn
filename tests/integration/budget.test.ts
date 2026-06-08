import { describe, it, expect, vi, beforeEach } from 'vitest'
import { supabase } from '@/shared/lib/supabase'
import {
  fetchLignesBudgetaires,
  modifierCredit,
} from '@/features/budget/api/budget-api'
import { calculerCreditDisponible, calculerTauxConsommation } from '@/shared/lib/utils'
import { canDo } from '@/shared/lib/utils'
import { PERMISSIONS } from '@/shared/constants/permissions'

const TENANT_ID = 'tenant-budget-0000-0000-000000000001'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('Module Budget', () => {
  it('fetchLignesBudgetaires passe par la vue "vue_credits_disponibles" avec le tenant_id', async () => {
    await fetchLignesBudgetaires('exercice-001', TENANT_ID)

    expect(vi.mocked(supabase.from)).toHaveBeenCalledWith('vue_credits_disponibles')
    expect(vi.mocked(supabase.from('vue_credits_disponibles').eq))
      .toHaveBeenCalledWith('tenant_id', TENANT_ID)
  })

  it('credits_disponibles = credit_revise - montant_engage (jamais négatif)', () => {
    const disponible = calculerCreditDisponible(10_000_000, 2_000_000)
    expect(disponible).toBe(8_000_000)
    expect(disponible).toBeGreaterThanOrEqual(0)
  })

  it('credits_disponibles est 0 si engage > revise (pas de négatif)', () => {
    const disponible = calculerCreditDisponible(5_000_000, 8_000_000)
    expect(disponible).toBe(0)
    expect(disponible).toBeGreaterThanOrEqual(0)
  })

  it('taux_consommation retourne un pourcentage (0-100)', () => {
    // calculerTauxConsommation(montantOrdonnance, creditRevise) → % avec 1 décimale
    const taux = calculerTauxConsommation(2_000_000, 10_000_000)
    expect(taux).toBeCloseTo(20.0)
    expect(taux).toBeLessThan(100)
    expect(taux).toBeGreaterThanOrEqual(0)
  })

  it('Alerte 90% : taux >= 90 est détecté', () => {
    const taux90 = calculerTauxConsommation(9_200_000, 10_000_000)
    expect(taux90).toBeGreaterThanOrEqual(90)
  })

  it('taux < 90 ne déclenche pas l\'alerte 90%', () => {
    const taux = calculerTauxConsommation(2_000_000, 10_000_000)
    expect(taux).toBeLessThan(90)
  })

  it('taux_consommation est 0 si credit_revise vaut 0', () => {
    const taux = calculerTauxConsommation(1_000_000, 0)
    expect(taux).toBe(0)
  })

  it('ADMIN_MINISTERE peut modifier les lignes budgétaires', () => {
    expect(canDo(PERMISSIONS.BUDGET_MODIFY, ['ADMIN_MINISTERE'])).toBe(true)
  })

  it('DAFF peut modifier les lignes budgétaires (LOLF guinéenne)', () => {
    expect(canDo(PERMISSIONS.BUDGET_MODIFY, ['DAFF'])).toBe(true)
  })

  it('SAFF ne peut PAS modifier les lignes budgétaires', () => {
    expect(canDo(PERMISSIONS.BUDGET_MODIFY, ['SAFF'])).toBe(false)
  })

  it('CF ne peut PAS modifier les lignes budgétaires', () => {
    expect(canDo(PERMISSIONS.BUDGET_MODIFY, ['CF'])).toBe(false)
  })

  it('ORDONNATEUR ne peut PAS modifier les lignes budgétaires', () => {
    expect(canDo(PERMISSIONS.BUDGET_MODIFY, ['ORDONNATEUR'])).toBe(false)
  })

  it('AUDITEUR ne peut PAS modifier les lignes budgétaires', () => {
    expect(canDo(PERMISSIONS.BUDGET_MODIFY, ['AUDITEUR'])).toBe(false)
  })

  it('modifierCredit appelle from("lignes_budgetaires") avec le tenant_id', async () => {
    await modifierCredit(
      { ligneId: 'lb-001', creditRevise: 12_000_000, motif: 'Rallonge budgétaire' },
      TENANT_ID
    )

    expect(vi.mocked(supabase.from)).toHaveBeenCalledWith('lignes_budgetaires')
    expect(vi.mocked(supabase.from('lignes_budgetaires').eq))
      .toHaveBeenCalledWith('tenant_id', TENANT_ID)
  })

  it('Les montants budgétaires doivent être des entiers GNF (pas de float)', () => {
    const creditInitial = 10_000_000
    const montantEngage = 2_000_000
    const disponible    = calculerCreditDisponible(creditInitial, montantEngage)

    expect(Number.isInteger(creditInitial)).toBe(true)
    expect(Number.isInteger(montantEngage)).toBe(true)
    expect(Number.isInteger(disponible)).toBe(true)
  })
})
