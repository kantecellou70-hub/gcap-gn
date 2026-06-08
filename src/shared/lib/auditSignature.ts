const HMAC_SECRET = import.meta.env.VITE_AUDIT_HMAC_SECRET ?? ''

let _warnedOnce = false

function warnMissingSecret() {
  if (!_warnedOnce) {
    console.warn('[GCAP-GN] VITE_AUDIT_HMAC_SECRET non défini — les signatures audit seront vides.')
    _warnedOnce = true
  }
}

export type AuditEntryToSign = {
  id: string
  tenantId: string
  userId: string | null
  action: string
  createdAt: string
}

export async function signAuditEntry(
  entry: AuditEntryToSign,
  secretOverride?: string
): Promise<string> {
  const secret = secretOverride ?? HMAC_SECRET
  if (!secret) {
    warnMissingSecret()
    return ''
  }

  const payload = [
    entry.id,
    entry.tenantId,
    entry.userId ?? 'system',
    entry.action,
    entry.createdAt,
  ].join('|')

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))

  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function verifyAuditSignature(
  entry: AuditEntryToSign & { signature: string | null },
  secretOverride?: string
): Promise<boolean> {
  if (!entry.signature) return false
  const expected = await signAuditEntry(entry, secretOverride)
  return expected !== '' && expected === entry.signature
}
