import { useState } from 'react'
import { CheckCircle, XCircle, FileText } from 'lucide-react'
import { StatutBadge } from '@/shared/components/StatutBadge'
import { MontantGNF } from '@/shared/components/MontantGNF'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { formatDate } from '@/shared/lib/utils'
import { cn } from '@/shared/lib/utils'
import type { Engagement } from '../types'

interface EngagementVisaCardProps {
  engagement: Engagement
  onViser: () => void
  onRejeter: (motif: string) => void
  isLoading?: boolean
}

export function EngagementVisaCard({ engagement: e, onViser, onRejeter, isLoading }: EngagementVisaCardProps) {
  const [showViser, setShowViser] = useState(false)
  const [showRejet, setShowRejet] = useState(false)
  const [motif, setMotif] = useState('')

  const creditDispo = e.ligneBudgetaire?.creditDisponible ?? 0
  const pctRisque = e.ligneBudgetaire?.creditRevise
    ? Math.round((e.montantEngage / e.ligneBudgetaire.creditRevise) * 100)
    : 0

  const risqueColor =
    pctRisque > 90 ? 'bg-red-500' :
    pctRisque > 70 ? 'bg-amber-400' :
    'bg-green-500'

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow">
      {/* En-tête */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-indigo-400" />
            <span className="font-mono text-sm text-indigo-600 font-semibold">{e.numero || '—'}</span>
            <StatutBadge statut={e.statut} type="engagement" />
          </div>
          <p className="mt-1 text-sm text-slate-800 font-medium line-clamp-2">{e.objet}</p>
        </div>
        <MontantGNF montant={e.montantEngage} taille="md" />
      </div>

      {/* Ligne budgétaire */}
      {e.ligneBudgetaire && (
        <div className="bg-slate-50 rounded-lg p-3 mb-3 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">
              <span className="font-mono text-indigo-600">{e.ligneBudgetaire.codeChapitre}.{e.ligneBudgetaire.codeArticle}</span>
              {' — '}{e.ligneBudgetaire.libelle}
            </span>
          </div>
          {/* Jauge risque */}
          <div>
            <div className="flex justify-between text-slate-500 mb-1">
              <span>Crédit disponible : <strong><MontantGNF montant={creditDispo} taille="xs" couleur={creditDispo < e.montantEngage ? 'danger' : 'success'} /></strong></span>
              <span className={cn('font-semibold', pctRisque > 90 ? 'text-red-600' : 'text-slate-700')}>{pctRisque}%</span>
            </div>
            <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div className={cn('h-full rounded-full', risqueColor)} style={{ width: `${Math.min(100, pctRisque)}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* Pied */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400">
          Soumis le {formatDate(e.dateCreation)}
          {e.createur && ` par ${e.createur.prenom} ${e.createur.nom}`}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={isLoading}
            onClick={() => setShowRejet(true)}
            className="flex items-center gap-1 rounded-lg border border-red-300 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            <XCircle size={13} />
            Rejeter
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={() => setShowViser(true)}
            className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            <CheckCircle size={13} />
            Viser
          </button>
        </div>
      </div>

      {/* Confirm visa */}
      <ConfirmDialog
        ouvert={showViser}
        titre="Apposer votre visa ?"
        description={`Engagement ${e.numero} — ${e.objet.slice(0, 60)}`}
        variant="default"
        labelConfirm="Viser"
        onConfirm={() => { setShowViser(false); onViser() }}
        onCancel={() => setShowViser(false)}
      />

      {/* Dialog rejet */}
      {showRejet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowRejet(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-base font-semibold text-red-700 mb-3">Motif de rejet</h2>
            <textarea
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              rows={4}
              autoFocus
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
              placeholder="Expliquez précisément le motif de rejet (min 20 caractères)…"
            />
            <p className="text-xs text-slate-400 mt-1">{motif.length}/20 minimum</p>
            <div className="flex justify-end gap-3 mt-4">
              <button type="button" onClick={() => setShowRejet(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">
                Annuler
              </button>
              <button
                type="button"
                disabled={motif.trim().length < 20}
                onClick={() => { setShowRejet(false); onRejeter(motif); setMotif('') }}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                Rejeter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
