import { describe, it, expect, vi, beforeEach } from 'vitest'
import { supabase } from '@/shared/lib/supabase'
import {
  createEngagement,
  fetchEngagement,
  visaEngagement,
  updateStatutEngagement,
} from '@/features/engagements/api/engagements-api'
import {
  createLiquidation,
} from '@/features/liquidations/api/liquidations-api'
import {
  emettreMandatPaiement,
} from '@/features/ordonnancement/api/ordonnancement-api'
import { canDo } from '@/shared/lib/utils'
import { PERMISSIONS } from '@/shared/constants/permissions'

const TENANT_A = 'aaaaaaaa-0000-0000-0000-000000000001'
const TENANT_B = 'bbbbbbbb-0000-0000-0000-000000000002'
const USER_SAFF = 'user-saff-0000-0000-0000-000000000001'
const USER_CF   = 'user-cf-000-0000-0000-000000000002'
const USER_ORD  = 'user-ord-0000-0000-0000-000000000003'
const USER_DAFF = 'user-daff-000-0000-0000-000000000004'

const mockEngagementRow = {
  id: 'eng-0001',
  tenant_id: TENANT_A,
  numero: 'ENG-2026-001',
  exercice_id: 'exercice-001',
  ligne_budgetaire_id: 'lb-001',
  objet: 'Fournitures de bureau',
  fournisseur: 'SOGEA',
  montant_engage: 5_000_000,
  statut: 'EN_ATTENTE_VISA',
  date_creation: '2026-01-15T10:00:00.000Z',
  created_by: USER_SAFF,
  date_visa_cf: null,
  vise_par: null,
  motif_rejet: null,
  pieces_jointes: [],
  metadata: {},
  reference_marche: null,
  ligne_budgetaire: null,
  createur: null,
  viseur: null,
}

const mockLiquidationRow = {
  id: 'liq-0001',
  tenant_id: TENANT_A,
  engagement_id: 'eng-0001',
  numero: 'LIQ-2026-001',
  montant_liquide: 5_000_000,
  retenue_source: 250_000,
  penalite_retard: 0,
  avance_recuperee: 0,
  montant_deductions: 250_000,
  montant_net: 4_750_000,
  date_service_fait: '2026-01-20T00:00:00.000Z',
  reference_pvsf: 'PVSF-001',
  statut: 'VALIDEE',
  created_by: USER_DAFF,
  created_at: '2026-01-20T10:00:00.000Z',
  pieces_jointes: [],
  engagement: null,
  createur: null,
  valideur: null,
}

const mockMandatRow = {
  id: 'mandat-0001',
  tenant_id: TENANT_A,
  liquidation_id: 'liq-0001',
  engagement_id: 'eng-0001',
  numero: 'MDP-2026-001',
  montant: 4_750_000,
  mode_paiement: 'VIREMENT',
  beneficiaire: 'SOGEA',
  statut: 'EMIS',
  date_emission: '2026-01-25T10:00:00.000Z',
  emis_par: USER_ORD,
  pieces_jointes: [],
  liquidation: null,
  emetteur: null,
}

// Helper : configure le mock .single() pour le prochain appel
function mockNextSingle(data: unknown, error: null | { message: string } = null) {
  vi.mocked(supabase.from('').single).mockResolvedValueOnce({ data, error } as never)
}

beforeEach(() => {
  vi.clearAllMocks()
  // Réinitialiser .single() à sa valeur par défaut après chaque test
  vi.mocked(supabase.from('').single).mockResolvedValue({ data: null, error: null } as never)
})

// ─── Engagement — permissions ─────────────────────────────────────────────────

describe('Engagement — permissions LOLF', () => {
  it('DAFF peut créer un engagement', () => {
    expect(canDo(PERMISSIONS.ENGAGEMENT_CREATE, ['DAFF'])).toBe(true)
  })

  it('SAFF peut créer un engagement', () => {
    expect(canDo(PERMISSIONS.ENGAGEMENT_CREATE, ['SAFF'])).toBe(true)
  })

  it('CF ne peut PAS créer un engagement (séparation des fonctions)', () => {
    expect(canDo(PERMISSIONS.ENGAGEMENT_CREATE, ['CF'])).toBe(false)
  })

  it('AUDITEUR ne peut PAS créer un engagement', () => {
    expect(canDo(PERMISSIONS.ENGAGEMENT_CREATE, ['AUDITEUR'])).toBe(false)
  })

  it('CF peut viser un engagement (exclusivité CF)', () => {
    expect(canDo(PERMISSIONS.ENGAGEMENT_VISA, ['CF'])).toBe(true)
  })

  it('CF peut rejeter un engagement (exclusivité CF)', () => {
    expect(canDo(PERMISSIONS.ENGAGEMENT_REJECT, ['CF'])).toBe(true)
  })

  it('SAFF ne peut PAS viser un engagement (exclusivité CF)', () => {
    expect(canDo(PERMISSIONS.ENGAGEMENT_VISA, ['SAFF'])).toBe(false)
  })

  it('DAFF ne peut PAS viser un engagement (exclusivité CF)', () => {
    expect(canDo(PERMISSIONS.ENGAGEMENT_VISA, ['DAFF'])).toBe(false)
  })

  it('ORDONNATEUR ne peut PAS viser un engagement (exclusivité CF)', () => {
    expect(canDo(PERMISSIONS.ENGAGEMENT_VISA, ['ORDONNATEUR'])).toBe(false)
  })
})

// ─── Liquidation — permissions ────────────────────────────────────────────────

describe('Liquidation — permissions LOLF', () => {
  it('DAFF peut créer une liquidation', () => {
    expect(canDo(PERMISSIONS.LIQUIDATION_CREATE, ['DAFF'])).toBe(true)
  })

  it('SAFF peut créer une liquidation', () => {
    expect(canDo(PERMISSIONS.LIQUIDATION_CREATE, ['SAFF'])).toBe(true)
  })

  it('DAFF peut valider une liquidation (fonction comptable)', () => {
    expect(canDo(PERMISSIONS.LIQUIDATION_VALIDATE, ['DAFF'])).toBe(true)
  })

  it('CF ne peut PAS créer une liquidation', () => {
    expect(canDo(PERMISSIONS.LIQUIDATION_CREATE, ['CF'])).toBe(false)
  })

  it('ORDONNATEUR ne peut PAS valider une liquidation (il ordonnance, pas liquide)', () => {
    expect(canDo(PERMISSIONS.LIQUIDATION_VALIDATE, ['ORDONNATEUR'])).toBe(false)
  })
})

// ─── Ordonnancement — permissions ─────────────────────────────────────────────

describe('Ordonnancement — permissions LOLF', () => {
  it('ORDONNATEUR peut émettre un mandat', () => {
    expect(canDo(PERMISSIONS.MANDAT_EMIT, ['ORDONNATEUR'])).toBe(true)
  })

  it('DAFF peut émettre un mandat (LOLF guinéenne)', () => {
    // Spécificité guinéenne : DAFF cumule ordonnancement et comptabilité
    expect(canDo(PERMISSIONS.MANDAT_EMIT, ['DAFF'])).toBe(true)
  })

  it('CF ne peut PAS émettre un mandat', () => {
    expect(canDo(PERMISSIONS.MANDAT_EMIT, ['CF'])).toBe(false)
  })

  it('SAFF ne peut PAS émettre un mandat', () => {
    expect(canDo(PERMISSIONS.MANDAT_EMIT, ['SAFF'])).toBe(false)
  })

  it('AUDITEUR ne peut PAS émettre un mandat', () => {
    expect(canDo(PERMISSIONS.MANDAT_EMIT, ['AUDITEUR'])).toBe(false)
  })
})

// ─── Appels Supabase — engagement ────────────────────────────────────────────

describe('Engagement — appels Supabase', () => {
  it('createEngagement appelle from("engagements_depenses") avec le tenant_id', async () => {
    mockNextSingle({ ...mockEngagementRow, statut: 'EN_ATTENTE_VISA' })

    const result = await createEngagement(
      { objet: 'Fournitures', exerciceId: 'ex-001', ligneBudgetaireId: 'lb-001', montantEngage: 5_000_000 },
      TENANT_A, USER_SAFF, 'EN_ATTENTE_VISA'
    )

    expect(vi.mocked(supabase.from)).toHaveBeenCalledWith('engagements_depenses')
    expect(result.statut).toBe('EN_ATTENTE_VISA')
  })

  it('fetchEngagement filtre par tenant_id', async () => {
    mockNextSingle(mockEngagementRow)

    const result = await fetchEngagement('eng-0001', TENANT_A)

    expect(vi.mocked(supabase.from('engagements_depenses').eq))
      .toHaveBeenCalledWith('tenant_id', TENANT_A)
    expect(result.tenantId).toBe(TENANT_A)
  })

  it('updateStatutEngagement ajoute date_visa_cf quand statut = VISE', async () => {
    await updateStatutEngagement('eng-0001', 'VISE', TENANT_A, { visePar: USER_CF })

    expect(vi.mocked(supabase.from('engagements_depenses').update))
      .toHaveBeenCalledWith(
        expect.objectContaining({ statut: 'VISE', date_visa_cf: expect.any(String) })
      )
  })

  it('visaEngagement appelle updateStatutEngagement avec la bonne décision', async () => {
    await visaEngagement(
      { engagementId: 'eng-0001', decision: 'REJETE', motifRejet: 'Pièces insuffisantes' },
      TENANT_A, USER_CF
    )

    expect(vi.mocked(supabase.from('engagements_depenses').update))
      .toHaveBeenCalledWith(
        expect.objectContaining({ statut: 'REJETE', motif_rejet: 'Pièces insuffisantes' })
      )
  })
})

// ─── Appels Supabase — liquidation ────────────────────────────────────────────

describe('Liquidation — appels Supabase', () => {
  it('createLiquidation calcule montantNet = brut - retenues (INTEGER)', async () => {
    mockNextSingle(mockLiquidationRow)

    const liq = await createLiquidation(
      {
        engagementId: 'eng-0001',
        montantBrut: 5_000_000,
        retenuSource: 250_000,
        penaliteRetard: 0,
        avanceRecuperee: 0,
        dateServiceFait: '2026-01-20',
        referencePvsf: 'PVSF-001',
      },
      TENANT_A, USER_DAFF
    )

    expect(liq.montantNet).toBe(4_750_000)
    expect(Number.isInteger(liq.montantNet)).toBe(true)
    expect(Number.isInteger(liq.montantBrut)).toBe(true)
  })

  it('createLiquidation rejette si montantNet <= 0', async () => {
    await expect(
      createLiquidation(
        {
          engagementId: 'eng-0001',
          montantBrut: 100_000,
          retenuSource: 100_000,
          penaliteRetard: 0,
          avanceRecuperee: 1_000,
          dateServiceFait: '2026-01-20',
          referencePvsf: 'PVSF-002',
        },
        TENANT_A, USER_DAFF
      )
    ).rejects.toThrow(/montant net/i)
  })

  it('createLiquidation appelle from("liquidations")', async () => {
    mockNextSingle(mockLiquidationRow)

    await createLiquidation(
      { engagementId: 'eng-0001', montantBrut: 1_000_000, retenuSource: 0,
        penaliteRetard: 0, avanceRecuperee: 0, dateServiceFait: '2026-01-20', referencePvsf: 'PVSF-003' },
      TENANT_A, USER_DAFF
    )

    expect(vi.mocked(supabase.from)).toHaveBeenCalledWith('liquidations')
  })
})

// ─── Appels Supabase — ordonnancement ────────────────────────────────────────

describe('Ordonnancement — appels Supabase', () => {
  it('emettreMandatPaiement appelle from("mandats_paiement") avec statut EMIS', async () => {
    mockNextSingle(mockMandatRow)

    const mandat = await emettreMandatPaiement(
      { liquidationId: 'liq-0001', montant: 4_750_000, modePaiement: 'VIREMENT', beneficiaire: 'SOGEA' },
      TENANT_A, USER_ORD
    )

    expect(vi.mocked(supabase.from)).toHaveBeenCalledWith('mandats_paiement')
    expect(mandat.statut).toBe('EMIS')
  })
})

// ─── Séparation des fonctions — résumé LOLF ──────────────────────────────────

describe('Séparation des fonctions — matrice complète', () => {
  it('CF ne peut ni créer ni émettre — uniquement viser', () => {
    expect(canDo(PERMISSIONS.ENGAGEMENT_CREATE, ['CF'])).toBe(false)
    expect(canDo(PERMISSIONS.MANDAT_EMIT, ['CF'])).toBe(false)
    expect(canDo(PERMISSIONS.ENGAGEMENT_VISA, ['CF'])).toBe(true)
  })

  it('AUDITEUR n\'a aucun droit d\'écriture', () => {
    const writingPermissions = [
      PERMISSIONS.ENGAGEMENT_CREATE,
      PERMISSIONS.ENGAGEMENT_VISA,
      PERMISSIONS.ENGAGEMENT_REJECT,
      PERMISSIONS.LIQUIDATION_CREATE,
      PERMISSIONS.LIQUIDATION_VALIDATE,
      PERMISSIONS.MANDAT_EMIT,
      PERMISSIONS.BUDGET_MODIFY,
      PERMISSIONS.USERS_MANAGE,
    ]
    writingPermissions.forEach((p) => {
      expect(canDo(p, ['AUDITEUR'])).toBe(false)
    })
  })
})

// ─── Isolation multi-tenant ───────────────────────────────────────────────────

describe('Isolation multi-tenant', () => {
  it('fetchEngagement(id, TENANT_A) transmet bien TENANT_A à Supabase', async () => {
    mockNextSingle(mockEngagementRow)

    await fetchEngagement('eng-0001', TENANT_A)

    expect(vi.mocked(supabase.from('engagements_depenses').eq))
      .toHaveBeenCalledWith('tenant_id', TENANT_A)
  })

  it('fetchEngagement(id, TENANT_B) transmet bien TENANT_B à Supabase', async () => {
    mockNextSingle({ ...mockEngagementRow, tenant_id: TENANT_B })

    const eng = await fetchEngagement('eng-0001', TENANT_B)

    expect(vi.mocked(supabase.from('engagements_depenses').eq))
      .toHaveBeenCalledWith('tenant_id', TENANT_B)
    expect(eng.tenantId).toBe(TENANT_B)
  })

  it('fetchEngagement lève une erreur si Supabase retourne une erreur', async () => {
    mockNextSingle(null, { message: 'Row not found' })

    await expect(fetchEngagement('eng-inexistant', TENANT_A)).rejects.toThrow('Row not found')
  })
})
