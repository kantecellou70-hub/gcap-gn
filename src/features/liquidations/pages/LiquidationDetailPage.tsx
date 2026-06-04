import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle, XCircle, AlertTriangle, Send, FileText } from 'lucide-react'
import { PageHeader } from '@/shared/components/PageHeader'
import { StatutBadge } from '@/shared/components/StatutBadge'
import { MontantGNF } from '@/shared/components/MontantGNF'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { useAuth } from '@/app/contexts/AuthContext'
import { canDo } from '@/shared/lib/utils'
import { formatDate, formatDateTime } from '@/shared/lib/utils'
import { PERMISSIONS } from '@/shared/constants/permissions'
import {
  useLiquidation,
  useSoumettreeLiquidation,
  useValiderLiquidation,
  useRejeterLiquidation,
  useAnnulerLiquidation,
} from '../hooks/useLiquidations'
import { ROLES_LIQUIDATION_CREATE } from '../constants'
import type { Role } from '@/shared/types'

type DialogType = 'soumettre' | 'valider' | 'rejeter' | 'annuler' | null

// Ligne label/valeur sans sémantique dl/dt/dd
function LigneInfo({
  label,
  children,
  vertical = false,
  bold = false,
}: {
  label: string
  children: React.ReactNode
  vertical?: boolean
  bold?: boolean
}) {
  if (vertical) {
    return (
      <div>
        <p className="text-slate-500 text-xs mb-0.5">{label}</p>
        <p className={bold ? 'font-semibold text-slate-800' : 'text-slate-800'}>{children}</p>
      </div>
    )
  }
  return (
    <div className="flex justify-between items-start gap-2">
      <span className="text-slate-500 shrink-0">{label}</span>
      <span className={`text-right ${bold ? 'font-semibold text-slate-800' : 'text-slate-800'}`}>
        {children}
      </span>
    </div>
  )
}

export function LiquidationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { profil } = useAuth()

  const { data: liq, isLoading, error } = useLiquidation(id!)
  const soumettre = useSoumettreeLiquidation()
  const valider   = useValiderLiquidation()
  const rejeter   = useRejeterLiquidation()
  const annuler   = useAnnulerLiquidation()

  const [dialog, setDialog]   = useState<DialogType>(null)
  const [motifRejet, setMotif] = useState('')

  const roles = profil?.roles ?? []
  const canCreate   = roles.some((r) => ROLES_LIQUIDATION_CREATE.includes(r as string))
  const canValidate = canDo(PERMISSIONS.LIQUIDATION_VALIDATE, roles as Role[])

  if (isLoading) return (
    <div className="space-y-4">
      {[1, 2, 3, 4].map((i) => <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />)}
    </div>
  )

  if (error || !liq) return (
    <div className="flex items-center gap-3 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-red-700">
      <AlertTriangle size={16} /> Liquidation introuvable.
    </div>
  )

  const isBrouillon = liq.statut === 'BROUILLON'
  const isSoumise   = liq.statut === 'SOUMISE'
  const isValidee   = liq.statut === 'VALIDEE'
  const isPending   = soumettre.isPending || valider.isPending || rejeter.isPending || annuler.isPending

  function doAction(type: DialogType) {
    if (!id) return
    switch (type) {
      case 'soumettre':
        soumettre.mutate(id, { onSuccess: () => { navigate('/liquidations'); setDialog(null) } })
        break
      case 'valider':
        valider.mutate(id, { onSuccess: () => { navigate('/liquidations'); setDialog(null) } })
        break
      case 'rejeter':
        if (!motifRejet.trim()) return
        rejeter.mutate({ id, motif: motifRejet }, { onSuccess: () => { navigate('/liquidations'); setDialog(null) } })
        break
      case 'annuler':
        annuler.mutate(id, { onSuccess: () => { navigate('/liquidations'); setDialog(null) } })
        break
    }
  }

  return (
    <div>
      <PageHeader
        titre={liq.numero || 'Liquidation'}
        description={liq.engagement?.numero ? `Sur engagement ${liq.engagement.numero}` : ''}
        actions={
          <button type="button" onClick={() => navigate('/liquidations')}
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
            <ArrowLeft size={16} /> Retour
          </button>
        }
      />

      {/* Statut */}
      <div className="mb-4 flex items-center gap-3">
        <StatutBadge statut={liq.statut} type="liquidation" />
        {liq.motifRejet && (
          <span className="text-sm text-red-600 italic">Motif : {liq.motifRejet}</span>
        )}
      </div>

      {/* ─── Actions par statut + rôle ─────────────────────────────────── */}
      <div className="mb-6 flex flex-wrap gap-3">
        {isBrouillon && canCreate && (
          <>
            <button type="button" onClick={() => setDialog('soumettre')} disabled={isPending}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
              <Send size={16} /> Soumettre pour validation
            </button>
            <button type="button" onClick={() => setDialog('annuler')} disabled={isPending}
              className="flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50">
              <XCircle size={16} /> Annuler
            </button>
          </>
        )}

        {isSoumise && canValidate && (
          <>
            <button type="button" onClick={() => setDialog('valider')} disabled={isPending}
              className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50">
              <CheckCircle size={16} /> Valider
            </button>
            <button type="button" onClick={() => setDialog('rejeter')} disabled={isPending}
              className="flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50">
              <XCircle size={16} /> Rejeter
            </button>
          </>
        )}

        {isValidee && canValidate && (
          <button type="button" onClick={() => navigate('/ordonnancement')}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            <FileText size={16} /> Créer le mandat de paiement →
          </button>
        )}
      </div>

      {/* ─── Corps ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Détail liquidation */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">Liquidation</p>
          <div className="space-y-3 text-sm">
            <LigneInfo label="Numéro">
              <span className="font-mono text-indigo-600">{liq.numero}</span>
            </LigneInfo>
            <LigneInfo label="Date service fait">{formatDate(liq.dateServiceFait)}</LigneInfo>
            <LigneInfo label="Réf. PV service fait">
              <span className="font-mono text-xs">{liq.referencePvsf || '—'}</span>
            </LigneInfo>
            {liq.dateFacture   && <LigneInfo label="Date facture">{formatDate(liq.dateFacture)}</LigneInfo>}
            {liq.numeroFacture && (
              <LigneInfo label="N° facture">
                <span className="font-mono text-xs">{liq.numeroFacture}</span>
              </LigneInfo>
            )}

            {/* Montants */}
            <div className="border-t border-slate-100 pt-3 space-y-2">
              <LigneInfo label="Montant brut">
                <MontantGNF montant={liq.montantBrut} taille="sm" />
              </LigneInfo>
              {liq.retenuSource   > 0 && (
                <LigneInfo label="— Retenue source">
                  <MontantGNF montant={liq.retenuSource} taille="sm" couleur="muted" />
                </LigneInfo>
              )}
              {liq.penaliteRetard > 0 && (
                <LigneInfo label="— Pénalités">
                  <MontantGNF montant={liq.penaliteRetard} taille="sm" couleur="muted" />
                </LigneInfo>
              )}
              {liq.avanceRecuperee > 0 && (
                <LigneInfo label="— Avance récupérée">
                  <MontantGNF montant={liq.avanceRecuperee} taille="sm" couleur="muted" />
                </LigneInfo>
              )}
              <LigneInfo label="Montant NET" bold>
                <MontantGNF montant={liq.montantNet} taille="sm" couleur="success" />
              </LigneInfo>
            </div>

            {/* Méta */}
            <div className="border-t border-slate-100 pt-3 space-y-2 text-xs">
              <LigneInfo label="Créée le">{formatDateTime(liq.createdAt)}</LigneInfo>
              {liq.createur && (
                <LigneInfo label="Créée par">
                  {liq.createur.prenom} {liq.createur.nom}
                </LigneInfo>
              )}
              {liq.valideur && (
                <LigneInfo label="Validée par">
                  {liq.valideur.prenom} {liq.valideur.nom}
                </LigneInfo>
              )}
            </div>
          </div>
        </div>

        {/* Engagement associé */}
        {liq.engagement && (
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">Engagement associé</p>
            <div className="space-y-3 text-sm">
              <LigneInfo label="Numéro">
                <span className="font-mono text-indigo-600">{liq.engagement.numero}</span>
              </LigneInfo>
              <LigneInfo label="Objet" vertical>{liq.engagement.objet}</LigneInfo>
              {liq.engagement.fournisseur && (
                <LigneInfo label="Fournisseur">{liq.engagement.fournisseur}</LigneInfo>
              )}
              <LigneInfo label="Montant engagé">
                <MontantGNF montant={liq.engagement.montantEngage} taille="sm" />
              </LigneInfo>
              {liq.engagement.ligneBudgetaire && (
                <LigneInfo label="Ligne budgétaire" vertical>
                  <span className="font-mono text-xs text-indigo-600">
                    {liq.engagement.ligneBudgetaire.codeChapitre}
                  </span>
                  {' '}{liq.engagement.ligneBudgetaire.libelle}
                </LigneInfo>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ─── Dialogues ──────────────────────────────────────────────────── */}

      <ConfirmDialog
        ouvert={dialog === 'soumettre'}
        titre="Soumettre la liquidation"
        description="La liquidation sera soumise pour validation. Confirmer ?"
        onConfirm={() => doAction('soumettre')}
        onCancel={() => setDialog(null)}
        labelConfirm="Soumettre"
      />

      <ConfirmDialog
        ouvert={dialog === 'valider'}
        titre="Valider la liquidation"
        description={`Confirmer la validation ? L'engagement passera en statut LIQUIDÉ. Montant net : ${liq.montantNet.toLocaleString('fr-GN')} GNF.`}
        onConfirm={() => doAction('valider')}
        onCancel={() => setDialog(null)}
        labelConfirm="Valider"
      />

      <ConfirmDialog
        ouvert={dialog === 'annuler'}
        titre="Annuler la liquidation"
        description="L'annulation est définitive. Confirmer ?"
        onConfirm={() => doAction('annuler')}
        onCancel={() => setDialog(null)}
        variant="danger"
        labelConfirm="Annuler la liquidation"
        labelCancel="Non, conserver"
      />

      {/* Rejet avec motif */}
      {dialog === 'rejeter' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDialog(null)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-2">Rejeter la liquidation</h2>
            <p className="text-sm text-slate-500 mb-4">Indiquez le motif du rejet (obligatoire).</p>
            <textarea
              value={motifRejet}
              onChange={(e) => setMotif(e.target.value)}
              rows={3}
              placeholder="Ex : Facture non conforme, montant incorrect…"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-400"
            />
            <div className="mt-4 flex justify-end gap-3">
              <button type="button" onClick={() => setDialog(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700">
                Annuler
              </button>
              <button type="button"
                disabled={!motifRejet.trim() || rejeter.isPending}
                onClick={() => doAction('rejeter')}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
                {rejeter.isPending ? 'Rejet…' : 'Rejeter'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
