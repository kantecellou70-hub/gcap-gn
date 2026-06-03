import { useEffect, useRef } from 'react'
import { AlertTriangle, Info, X } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

interface ConfirmDialogProps {
  ouvert: boolean
  titre: string
  description: string
  onConfirm: () => void
  onCancel: () => void
  variant?: 'danger' | 'warning' | 'default'
  labelConfirm?: string
  labelCancel?: string
}

export function ConfirmDialog({
  ouvert,
  titre,
  description,
  onConfirm,
  onCancel,
  variant = 'default',
  labelConfirm = 'Confirmer',
  labelCancel = 'Annuler',
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (ouvert) cancelRef.current?.focus()
  }, [ouvert])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel()
    }
    if (ouvert) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [ouvert, onCancel])

  if (!ouvert) return null

  const confirmClass =
    variant === 'danger'
      ? 'bg-red-600 hover:bg-red-700 text-white'
      : variant === 'warning'
      ? 'bg-amber-500 hover:bg-amber-600 text-white'
      : 'bg-indigo-600 hover:bg-indigo-700 text-white'

  const Icon = variant === 'danger' || variant === 'warning' ? AlertTriangle : Info
  const iconColor = variant === 'danger' ? 'text-red-500' : variant === 'warning' ? 'text-amber-500' : 'text-indigo-500'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />

      {/* Dialogue */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
        >
          <X size={18} />
        </button>

        <div className="flex items-start gap-4">
          <div className={cn('shrink-0 mt-0.5', iconColor)}>
            <Icon size={24} strokeWidth={1.5} />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-semibold text-slate-900">{titre}</h2>
            <p className="mt-1 text-sm text-slate-500">{description}</p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            ref={cancelRef}
            onClick={onCancel}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            {labelCancel}
          </button>
          <button
            onClick={onConfirm}
            className={cn('rounded-lg px-4 py-2 text-sm font-medium transition-colors', confirmClass)}
          >
            {labelConfirm}
          </button>
        </div>
      </div>
    </div>
  )
}
