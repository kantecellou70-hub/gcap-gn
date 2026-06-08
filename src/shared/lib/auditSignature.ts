const HMAC_SECRET = import.meta.env.VITE_AUDIT_HMAC_SECRET ?? ''

let _warnedOnce = false

function warnMissingSecret() {
  if (!_warnedOnce) {
    console.warn('[GCAP-GN] VITE_AUDIT_HMAC_SECRET non défini — les signatures audit seront vides.')
    _warnedOnce = true
  }
}

export async function signAuditEntry(entry: {
  id: string
  tenantId: string
  userId: string | null
  action: string
  createdAt: string
}): Promise<string> {
  if (!HMAC_SECRET) {
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
    new TextEncoder().encode(HMAC_SECRET),
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
  entry: Parameters<typeof signAuditEntry>[0] & { signature: string | null }
): Promise<boolean> {
  if (!entry.signature) return false
  const expected = await signAuditEntry(entry)
  return expected !== '' && expected === entry.signature
}
