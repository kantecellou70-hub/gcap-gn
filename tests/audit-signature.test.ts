import { describe, it, expect } from 'vitest'
import { signAuditEntry, verifyAuditSignature } from '../src/shared/lib/auditSignature'

const SECRET = 'a3f8c2e1d94b7056f1820e3c49a6b7d8e5f2c1a0b9d4e7f3c2a1b0d9e8f7c6a5'

const BASE_ENTRY = {
  id:         '550e8400-e29b-41d4-a716-446655440000',
  tenantId:   'aaaaaaaa-1111-2222-3333-444444444444',
  userId:     'bbbbbbbb-5555-6666-7777-888888888888',
  action:     'engagement.visa.cf',
  createdAt:  '2026-01-15T10:30:00.000Z',
}

describe('signAuditEntry', () => {
  it('produit une signature hex de 64 caractères', async () => {
    const sig = await signAuditEntry(BASE_ENTRY, SECRET)
    expect(sig).toHaveLength(64)
    expect(sig).toMatch(/^[0-9a-f]{64}$/)
  })

  it('est déterministe — même entrée produit toujours la même signature', async () => {
    const sig1 = await signAuditEntry(BASE_ENTRY, SECRET)
    const sig2 = await signAuditEntry(BASE_ENTRY, SECRET)
    expect(sig1).toBe(sig2)
  })

  it('retourne une chaîne vide si le secret est absent', async () => {
    const sig = await signAuditEntry(BASE_ENTRY, '')
    expect(sig).toBe('')
  })

  it('produit une signature différente si un champ change', async () => {
    const sig1 = await signAuditEntry(BASE_ENTRY, SECRET)
    const sig2 = await signAuditEntry({ ...BASE_ENTRY, action: 'mandat.emis' }, SECRET)
    expect(sig1).not.toBe(sig2)
  })

  it("traite userId null comme 'system'", async () => {
    const withNull    = await signAuditEntry({ ...BASE_ENTRY, userId: null }, SECRET)
    const withSystem  = await signAuditEntry({ ...BASE_ENTRY, userId: 'system' }, SECRET)
    // Les deux doivent être identiques car null → 'system' dans le payload
    expect(withNull).not.toBe('')
    expect(withNull).toBe(withSystem)
  })
})

describe('verifyAuditSignature', () => {
  it('retourne true pour une signature valide', async () => {
    const sig = await signAuditEntry(BASE_ENTRY, SECRET)
    const ok  = await verifyAuditSignature({ ...BASE_ENTRY, signature: sig }, SECRET)
    expect(ok).toBe(true)
  })

  it('retourne false si le champ action a été modifié (falsification)', async () => {
    const sig = await signAuditEntry(BASE_ENTRY, SECRET)
    const ok  = await verifyAuditSignature(
      { ...BASE_ENTRY, action: 'engagement.supprime', signature: sig },
      SECRET
    )
    expect(ok).toBe(false)
  })

  it('retourne false si le tenantId a été modifié (cross-tenant)', async () => {
    const sig = await signAuditEntry(BASE_ENTRY, SECRET)
    const ok  = await verifyAuditSignature(
      { ...BASE_ENTRY, tenantId: 'cccccccc-9999-0000-1111-222222222222', signature: sig },
      SECRET
    )
    expect(ok).toBe(false)
  })

  it('retourne false si la signature est null', async () => {
    const ok = await verifyAuditSignature({ ...BASE_ENTRY, signature: null }, SECRET)
    expect(ok).toBe(false)
  })

  it('retourne false si la signature est une chaîne vide', async () => {
    const ok = await verifyAuditSignature({ ...BASE_ENTRY, signature: '' }, SECRET)
    expect(ok).toBe(false)
  })

  it('retourne false si la signature est corrompue (1 bit changé)', async () => {
    const sig     = await signAuditEntry(BASE_ENTRY, SECRET)
    const corrupt = sig.slice(0, -1) + (sig.endsWith('f') ? '0' : 'f')
    const ok      = await verifyAuditSignature({ ...BASE_ENTRY, signature: corrupt }, SECRET)
    expect(ok).toBe(false)
  })

  it('retourne false si le secret est différent', async () => {
    const sig = await signAuditEntry(BASE_ENTRY, SECRET)
    const ok  = await verifyAuditSignature({ ...BASE_ENTRY, signature: sig }, 'mauvais-secret')
    expect(ok).toBe(false)
  })
})
