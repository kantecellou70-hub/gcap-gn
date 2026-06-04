import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Pencil, AlertTriangle, RefreshCw } from 'lucide-react'
import { PageHeader } from '@/shared/components/PageHeader'
import { MontantGNF } from '@/shared/components/MontantGNF'
import { useAuth } from '@/app/contexts/AuthContext'
import { formatDate, formatDateTime } from '@/shared/lib/utils'
import { EtatBienBadge } from '../components/EtatBienBadge'
import { SicomSyncBadge } from '../components/SicomSyncBadge'
import { useBien, useReformerBien, useSyncBien } from '../hooks/useBiens'
import {
  CATEGORIE_LABELS,
  ROLES_MATIERES_GERER,
  ROLES_MATIERES_VALIDER,
} from '../constants'

function LigneInfo({ label, children, mono = false }: {
  label: string
  children: React.ReactNode
  mono?: boolean
}) {
  return (
    <div className="flex justify-between items-start gap-4 py-1.5 border-b border-slate-50 last:border-0">
      <span className="text-slate-500 text-sm shrink-0">{label}</span>
      <span className={`text-right text-sm text-slate-800 ${mono ? 'font-mono text-indigo-600' : ''}`}>
        {children}
      </span>
    </div>
  )
}

export function BienDetailPage() {
  const { id }      = useParams<{ id: string }>()
  const navigate    = useNavigate()
  const { profil }  = useAuth()

  const { data: bien, isLoading, error } = useBien(id!)
  const reformer   = useReformerBien()
  const syncBien   = useSyncBien()

  const [showReformerDialog, setShowReformerDialog] = useState(false)
  const [obsReforme, setObsReforme]                 = useState('')

  const roles      = profil?.roles ?? []
  const canGerer   = roles.some((r) => ROLES_MATIERES_GERER.includes(r as string))
  const canValider = roles.some((r) => ROLES_MATIERES_VALIDER.includes(r as string))

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  if (error || !bien) {
    return (
      <div className="flex items-center gap-3 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-red-700">
        <AlertTriangle size={16} /> Bien introuvable.
      </div>
    )
  }

  const isReforme    = bien.etat === 'REFORME'
  const isPendingAny = reformer.isPending || syncBien.isPending

  return (
    <div>
      <PageHeader
        titre={bien.codeInventaire}
        description={bien.designation}
        actions={
          <button type="button" onClick={() => navigate('/matieres')}
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
            <ArrowLeft size={16} /> Retour
          </button>
        }
      />

      {/* En-tête badges */}
      <div className="mb-4 flex items-center gap-3 flex-wrap">
        <EtatBienBadge etat={bien.etat} />
        <SicomSyncBadge sicomId={bien.sicomId} sicomSyncAt={bien.sicomSyncAt} />
        <span className="text-xs text-slate-400">
          {CATEGORIE_LABELS[bien.categorie]}
        </span>
      </div>

      {/* Actions */}
      {(canGerer || canValider) && !isReforme && (
        <div className="mb-6 flex flex-wrap gap-3">
          {canGerer && (
            <button
              type="button"
              onClick={() => navigate(`/matieres/${bien.id}/modifier`)}
              className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Pencil size={15} /> Modifier
            </button>
          )}
          {canValider && (
            <button
              type="button"
              onClick={() => setShowReformerDialog(true)}
              disabled={isPendingAny}
              className="flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              <AlertTriangle size={15} /> Réformer ce bien
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 max-w-5xl">
        {/* ─── Colonne gauche (2/3) ─────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Identification */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
              Identification
            </h3>
            <LigneInfo label="Code inventaire" mono>{bien.codeInventaire}</LigneInfo>
            <LigneInfo label="Désignation"><span className="font-medium">{bien.designation}</span></LigneInfo>
            <LigneInfo label="Catégorie">{CATEGORIE_LABELS[bien.categorie]}</LigneInfo>
            {bien.marque && <LigneInfo label="Marque">{bien.marque}</LigneInfo>}
            {bien.modele && <LigneInfo label="Modèle">{bien.modele}</LigneInfo>}
            {bien.numeroSerie && <LigneInfo label="N° série">{bien.numeroSerie}</LigneInfo>}
          </div>

          {/* Acquisition */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
              Acquisition
            </h3>
            <LigneInfo label="Date">
              {formatDate(bien.dateAcquisition)}
            </LigneInfo>
            <LigneInfo label="Valeur">
              <MontantGNF montant={bien.valeurAcquisition} taille="sm" />
            </LigneInfo>
            {bien.engagement && (
              <LigneInfo label="Engagement lié">
                <span className="font-mono text-xs text-indigo-600">
                  {bien.engagement.numero}
                </span>
                {' — '}
                <span className="text-slate-600">{bien.engagement.objet}</span>
              </LigneInfo>
            )}
          </div>

          {/* Affectation */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
              Affectation
            </h3>
            <LigneInfo label="Localisation">{bien.localisation}</LigneInfo>
            {bien.affecte && (
              <LigneInfo label="Affecté à">
                {bien.affecte.prenom} {bien.affecte.nom}
              </LigneInfo>
            )}
          </div>

          {/* Observations */}
          {bien.observations && (
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                Observations
              </h3>
              <p className="text-sm text-slate-700">{bien.observations}</p>
            </div>
          )}

          {/* Métadonnées */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
              Traçabilité
            </h3>
            <LigneInfo label="Créé le">
              <span className="text-xs">{formatDateTime(bien.createdAt)}</span>
            </LigneInfo>
            <LigneInfo label="Modifié le">
              <span className="text-xs">{formatDateTime(bien.updatedAt)}</span>
            </LigneInfo>
          </div>
        </div>

        {/* ─── Colonne droite (1/3) ─────────────────────────────────── */}
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
              Synchronisation SICOM
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Statut</span>
                <SicomSyncBadge sicomId={bien.sicomId} sicomSyncAt={bien.sicomSyncAt} />
              </div>
              {bien.sicomId ? (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">SICOM ID</span>
                  <span className="font-mono text-xs text-slate-700">{bien.sicomId}</span>
                </div>
              ) : (
                <p className="text-xs text-slate-400">Ce bien n'a pas encore été synchronisé avec le SICOM.</p>
              )}
              {bien.sicomSyncAt && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Dernière sync</span>
                  <span className="text-xs text-slate-700">
                    {new Intl.DateTimeFormat('fr-GN', {
                      day: '2-digit', month: '2-digit', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    }).format(new Date(bien.sicomSyncAt))}
                  </span>
                </div>
              )}
              {canGerer && (
                <button
                  type="button"
                  onClick={() => syncBien.mutate(bien.id)}
                  disabled={isPendingAny}
                  className="w-full flex items-center justify-center gap-2 rounded-lg border border-teal-300 px-3 py-2 text-sm font-medium text-teal-700 hover:bg-teal-50 disabled:opacity-50"
                >
                  <RefreshCw size={14} className={syncBien.isPending ? 'animate-spin' : ''} />
                  Forcer la sync
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Modal réforme ────────────────────────────────────────────── */}
      {showReformerDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowReformerDialog(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-1">Réformer ce bien</h2>
            <p className="text-sm text-slate-500 mb-4">La réforme est définitive. Ce bien sera retiré de l'inventaire actif.</p>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Motif de la réforme
              </label>
              <textarea
                value={obsReforme}
                onChange={(e) => setObsReforme(e.target.value)}
                rows={3}
                placeholder="Raison de la réforme, état constaté…"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-400"
              />
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" onClick={() => setShowReformerDialog(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                Annuler
              </button>
              <button
                type="button"
                disabled={reformer.isPending}
                onClick={() => {
                  reformer.mutate(
                    { id: bien.id, observations: obsReforme || 'Réformé' },
                    { onSuccess: () => { setShowReformerDialog(false); navigate('/matieres') } }
                  )
                }}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {reformer.isPending ? 'Réforme en cours…' : 'Confirmer la réforme'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
