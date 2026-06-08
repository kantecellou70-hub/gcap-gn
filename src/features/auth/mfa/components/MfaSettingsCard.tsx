import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck, ShieldOff, Trash2, Plus, Loader2 } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { useMfa } from '../hooks/useMfa'

export function MfaSettingsCard() {
  const navigate = useNavigate()
  const { isEnrolled, isRequired, factors, isLoading, unenrollFactor } = useMfa()
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function handleDelete(factorId: string) {
    setDeletingId(factorId)
    setDeleteError(null)
    try {
      await unenrollFactor(factorId)
      setConfirmDeleteId(null)
    } catch {
      setDeleteError('Impossible de supprimer ce factor. Réessayez.')
    } finally {
      setDeletingId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 flex items-center justify-center">
        <Loader2 className="animate-spin text-slate-400" size={24} />
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isEnrolled
            ? <ShieldCheck className="text-green-600" size={20} />
            : <ShieldOff className="text-red-500" size={20} />
          }
          <h3 className="font-semibold text-slate-900">Authentification à deux facteurs</h3>
        </div>
        <span className={cn(
          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
          isEnrolled ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        )}>
          {isEnrolled ? 'Actif' : 'Non activé'}
        </span>
      </div>

      <div className="px-6 py-4 flex flex-col gap-4">
        {!isEnrolled && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-slate-600">Aucun second facteur configuré.</p>
            {isRequired && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
                Le MFA est <strong>obligatoire</strong> pour votre rôle.
              </div>
            )}
            <button
              onClick={() => navigate('/mfa/enroll')}
              className={cn(
                'self-start flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium',
                'bg-indigo-600 hover:bg-indigo-700 text-white transition-colors'
              )}
            >
              <Plus size={14} />
              Activer le MFA
            </button>
          </div>
        )}

        {isEnrolled && (
          <div className="flex flex-col gap-3">
            {factors.filter((f) => f.status === 'verified').map((factor) => (
              <div key={factor.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {factor.friendly_name ?? 'Application d\'authentification'}
                  </p>
                  <p className="text-xs text-slate-500">
                    Ajouté le {new Date(factor.created_at).toLocaleDateString('fr-GN')}
                  </p>
                </div>

                {confirmDeleteId === factor.id ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-red-600">Confirmer ?</span>
                    <button
                      onClick={() => handleDelete(factor.id)}
                      disabled={!!deletingId}
                      className="text-xs text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
                    >
                      {deletingId === factor.id ? <Loader2 size={12} className="animate-spin" /> : 'Oui'}
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="text-xs text-slate-500 hover:text-slate-700"
                    >
                      Non
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteId(factor.id)}
                    className="text-slate-400 hover:text-red-500 transition-colors"
                    title="Supprimer ce factor"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}

            {deleteError && (
              <p className="text-xs text-red-600">{deleteError}</p>
            )}

            <button
              onClick={() => navigate('/mfa/enroll')}
              className="self-start flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Plus size={14} />
              Ajouter un autre appareil
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
