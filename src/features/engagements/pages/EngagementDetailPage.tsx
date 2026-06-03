import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Loader2, Send, CheckCircle, XCircle, Trash2 } from 'lucide-react'
import { StatutBadge } from '@/shared/components/StatutBadge'
import { MontantGNF } from '@/shared/components/MontantGNF'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { useAuth } from '@/app/contexts/AuthContext'
import { formatDate, formatDateTime, canDo } from '@/shared/lib/utils'
import { PERMISSIONS } from '@/shared/constants/permissions'
import { useEngagement, useSoumettreEngagement, useViserEngagement, useAnnulerEngagement } from '../hooks/useEngagements'
import { WorkflowTimeline } from '../components/WorkflowTimeline'

export function EngagementDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { profil } = useAuth()
  const roles = profil?.roles ?? []

  const { data: engagement, isLoading } = useEngagement(id!)
  const soumettre = useSoumettreEngagement()
  const viser    = useViserEngagement()
  const annuler  = useAnnulerEngagement()

  const [showRejet, setShowRejet] = useState(false)
  const [motifRejet, setMotifRejet] = useState('')
  const [showAnnuler, setShowAnnuler] = useState(false)
  const [motifAnnuler, setMotifAnnuler] = useState('')
  const [showViser, setShowViser] = useState(false)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-indigo-500" size={32} />
      </div>
    )
  }

  if (!engagement) {
    return <div className="text-slate-500 text-center py-12">Engagement introuvable.</div>
  }

  const e = engagement
  const canCF      = canDo(PERMISSIONS.ENGAGEMENT_VISA, roles)
  const canCreate  = canDo(PERMISSIONS.ENGAGEMENT_CREATE, roles)
  const isCreateur = e.createdBy === profil?.id

  return (
    <div>
      {/* En-tête */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <button
            type="button"
            onClick={() => navigate('/engagements')}
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-2"
          >
            <ArrowLeft size={14} />
            Retour à la liste
          </button>
          <div className="flex items-center gap-3">
            <span className="font-mono text-lg text-indigo-600 font-semibold">{e.numero || '—'}</span>
            <StatutBadge statut={e.statut} type="engagement" />
          </div>
          <p className="text-xs text-slate-500 mt-1">Créé le {formatDateTime(e.dateCreation)}</p>
        </div>

        {/* Boutons d'action */}
        <div className="flex items-center gap-2">
          {e.statut === 'BROUILLON' && canCreate && isCreateur && (
            <>
              <button
                type="button"
                onClick={() => soumettre.mutate(e.id)}
                disabled={soumettre.isPending}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                <Send size={14} />
                Soumettre au CF
              </button>
            </>
          )}
          {e.statut === 'EN_ATTENTE_VISA' && canCF && (
            <>
              <button
                type="button"
                onClick={() => setShowViser(true)}
                className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
              >
                <CheckCircle size={14} />
                Viser
              </button>
              <button
                type="button"
                onClick={() => setShowRejet(true)}
                className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                <XCircle size={14} />
                Rejeter
              </button>
            </>
          )}
          {e.statut === 'VISE' && canDo(PERMISSIONS.LIQUIDATION_CREATE, roles) && (
            <button
              type="button"
              onClick={() => navigate(`/liquidations/nouveau?engagementId=${e.id}`)}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Liquider
            </button>
          )}
          {!['ANNULE', 'ORDONNANCE'].includes(e.statut) && (
            <button
              type="button"
              onClick={() => setShowAnnuler(true)}
              className="flex items-center gap-2 rounded-lg border border-red-300 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              <Trash2 size={14} />
              Annuler
            </button>
          )}
        </div>
      </div>

      {/* Corps — 2 colonnes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gauche */}
        <div className="lg:col-span-2 space-y-4">

          {/* Identification */}
          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-4">Identification</h3>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div className="col-span-2">
                <dt className="text-xs text-slate-500">Objet</dt>
                <dd className="mt-0.5 text-slate-900">{e.objet}</dd>
              </div>
              {e.fournisseur && (
                <div>
                  <dt className="text-xs text-slate-500">Fournisseur</dt>
                  <dd className="text-slate-800">{e.fournisseur}</dd>
                </div>
              )}
              {e.referenceMarche && (
                <div>
                  <dt className="text-xs text-slate-500">Réf. marché</dt>
                  <dd className="text-slate-800">{e.referenceMarche}</dd>
                </div>
              )}
              {e.referenceBonCmd && (
                <div>
                  <dt className="text-xs text-slate-500">Bon de commande</dt>
                  <dd className="text-slate-800">{e.referenceBonCmd}</dd>
                </div>
              )}
              {e.dateEcheance && (
                <div>
                  <dt className="text-xs text-slate-500">Échéance</dt>
                  <dd className="text-slate-800">{formatDate(e.dateEcheance)}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Imputation */}
          {e.ligneBudgetaire && (
            <div className="bg-white border border-slate-200 rounded-lg p-6">
              <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-4">Imputation budgétaire</h3>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-xs text-slate-500">Code article</dt>
                  <dd className="font-mono text-indigo-600">
                    {e.ligneBudgetaire.codeChapitre}.{e.ligneBudgetaire.codeArticle}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Libellé</dt>
                  <dd className="text-slate-800">{e.ligneBudgetaire.libelle}</dd>
                </div>
              </dl>
            </div>
          )}

          {/* Montants */}
          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-4">Montants</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-slate-500">Engagé</p>
                <MontantGNF montant={e.montantEngage} taille="md" />
              </div>
            </div>
          </div>

          {/* Observations */}
          {e.observations && (
            <div className="bg-white border border-slate-200 rounded-lg p-6">
              <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-2">Observations</h3>
              <p className="text-sm text-slate-700">{e.observations}</p>
            </div>
          )}
        </div>

        {/* Droite — Timeline */}
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-4">Workflow</h3>
            <WorkflowTimeline engagement={e} />
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <ConfirmDialog
        ouvert={showViser}
        titre="Viser l'engagement ?"
        description={`Vous allez apposer votre visa sur l'engagement ${e.numero}. Cette action est irréversible.`}
        variant="default"
        labelConfirm="Confirmer le visa"
        onConfirm={() => {
          viser.mutate({ engagementId: e.id, decision: 'VISE' })
          setShowViser(false)
        }}
        onCancel={() => setShowViser(false)}
      />

      {/* Dialog rejet */}
      {showRejet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowRejet(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-base font-semibold text-red-700 mb-3">Rejeter l'engagement</h2>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Motif de rejet <span className="text-red-500">*</span> (min 20 caractères)
            </label>
            <textarea
              aria-label="Motif de rejet"
              value={motifRejet}
              onChange={(e) => setMotifRejet(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <p className="text-xs text-slate-400 mt-1">{motifRejet.length}/20 caractères minimum</p>
            <div className="flex justify-end gap-3 mt-4">
              <button type="button" onClick={() => setShowRejet(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">
                Annuler
              </button>
              <button
                type="button"
                disabled={motifRejet.trim().length < 20}
                onClick={() => {
                  viser.mutate({ engagementId: e.id, decision: 'REJETE', motifRejet })
                  setShowRejet(false)
                  setMotifRejet('')
                }}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                Rejeter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog annulation */}
      {showAnnuler && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowAnnuler(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-3">Annuler l'engagement</h2>
            <textarea
              value={motifAnnuler}
              onChange={(e) => setMotifAnnuler(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Motif d'annulation…"
            />
            <div className="flex justify-end gap-3 mt-4">
              <button type="button" onClick={() => setShowAnnuler(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">
                Annuler
              </button>
              <button
                type="button"
                disabled={motifAnnuler.trim().length < 5}
                onClick={() => {
                  annuler.mutate({ id: e.id, motif: motifAnnuler })
                  setShowAnnuler(false)
                }}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
