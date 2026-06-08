import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, MinusCircle, Loader2 } from 'lucide-react'
import { verifyAuditSignature } from '@/shared/lib/auditSignature'
import type { AuditLog } from '../types'

type Status = 'loading' | 'valid' | 'invalid' | 'absent'

interface Props {
  entry: AuditLog
}

export function SignatureStatusBadge({ entry }: Props) {
  const [status, setStatus] = useState<Status>('loading')

  useEffect(() => {
    if (!entry.signature) {
      setStatus('absent')
      return
    }

    let cancelled = false
    verifyAuditSignature({
      id:         entry.id,
      tenantId:   entry.tenantId ?? '',
      userId:     entry.userId,
      action:     entry.action,
      createdAt:  entry.createdAt,
      signature:  entry.signature,
    }).then((ok) => {
      if (!cancelled) setStatus(ok ? 'valid' : 'invalid')
    }).catch(() => {
      if (!cancelled) setStatus('invalid')
    })

    return () => { cancelled = true }
  }, [entry])

  if (status === 'loading') {
    return (
      <span className="inline-flex items-center gap-1 text-slate-400 text-xs">
        <Loader2 size={12} className="animate-spin" />
      </span>
    )
  }

  if (status === 'absent') {
    return (
      <span className="inline-flex items-center gap-1 text-slate-400 text-xs" title="Signature absente">
        <MinusCircle size={13} />
        <span className="hidden sm:inline">—</span>
      </span>
    )
  }

  if (status === 'valid') {
    return (
      <span className="inline-flex items-center gap-1 text-green-600 text-xs font-medium" title="Signature valide">
        <CheckCircle size={13} />
        <span className="hidden sm:inline">Valide</span>
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 text-red-600 text-xs font-medium" title="Signature invalide">
      <XCircle size={13} />
      <span className="hidden sm:inline">Invalide</span>
    </span>
  )
}
