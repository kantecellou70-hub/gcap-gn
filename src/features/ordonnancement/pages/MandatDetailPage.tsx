import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Send, CheckCircle, XCircle, Download, AlertTriangle } from 'lucide-react'
import { PageHeader } from '@/shared/components/PageHeader'
import { StatutBadge } from '@/shared/components/StatutBadge'
import { MontantGNF } from '@/shared/components/MontantGNF'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { useAuth } from '@/app/contexts/AuthContext'
import { formatDate, formatDateTime } from '@/shared/lib/utils'
import { useTenant } from '@/app/contexts/TenantContext'
import {
  useMandat,
  useTransmettreAuTresor,
  useEnregistrerPaiement,
  useRejeterParTresor,
  useAnnulerMandat,
} from '../hooks/useOrdonnancement'
import { generateMandatPdf } from '../lib/mandat-pdf'
import { ROLES_MANDAT_TRANSMIT, ROLES_MANDAT_PAY } from '../constants'

type DialogType = 'transmettre' | 'paiement' | 'rejeter' | 'annuler' | null

function LigneInfo({ label, children, bold = false }: { label: string; children: React.ReactNode; bold?: boolean }) {
  return (
    <div className="flex justify-between items-start gap-2">
      <span className="text-slate-500 shrink-0">{label}</span>
      <span className={`text-right ${bold ? 'font-semibold text-slate-800' : 'text-slate-800'}`}>
        {children}
      </span>
    </div>
  )
}

export function MandatDetailPage() {
  const { id }       = useParams<{ id: string }>()
  const navigate     = useNavigate()
  const { profil }   = useAuth()
  const { tenant }   = useTenant()

  const { data: mandat, isLoading, error } = useMandat(id!)
  const transmettre = useTransmettreAuTresor()
  const payer       = useEnregistrerPaiement()
  const rejeter     = useRejeterParTresor()
  const annuler     = useAnnulerMandat()

  const [dialog, setDialog]       = useState<DialogType>(null)
  const [motifRejet, setMotif]    = useState('')
  const [datePaiement, setDateP]  = useState('')
  const [referenceTresor, setRef] = useState('')

  const roles = profil?.roles ?? []
  const canTransmit = roles.some((r) => ROLES_MANDAT_TRANSMIT.includes(r as string))
  const canPay      = roles.some((r) => ROLES_MANDAT_PAY.includes(r as string))

  if (isLoading) return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />)}
    </div>
  )

  if (error || !mandat) return (
    <div className="flex items-center gap-3 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-red-700">
      <AlertTriangle size={16} /> Mandat introuvable.
    </div>
  )

  const isEmis    = mandat.statut === 'EMIS'
  const isTransmis = mandat.statut === 'TRANSMIS_TRESOR' || mandat.statut === 'PRIS_EN_CHARGE'
  const isPending  = transmettre.isPending || payer.isPending || rejeter.isPending || annuler.isPending

  function doAction(type: DialogType) {
    if (!id) return
    switch (type) {
      case 'transmettre':
        transmettre.mutate(id, { onSuccess: () => setDialog(null) })
        break
      case 'paiement':
        if (!datePaiement || !referenceTresor.trim()) return
        payer.mutate({ id, input: { datePaiement, referenceTresor } }, { onSuccess: () => setDialog(null) })
        break
      case 'rejeter':
        if (!motifRejet.trim()) return
        rejeter.mutate({ id, motif: motifRejet }, { onSuccess: () => setDialog(null) })
        break
      case 'annuler':
        annuler.mutate(id, { onSuccess: () => navigate('/ordonnancement') })
        break
    }
  }

  return (
    <div>
      <PageHeader
        titre={mandat.numero || 'Mandat'}
        description={mandat.liquidation?.engagement?.objet ?? ''}
        actions={
          <div className="flex items-center gap-2">
            <button type="button"
              onClick={() => void generateMandatPdf(mandat, tenant?.nom ?? 'Ministère')}
              className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
              <Download size={15} /> Exporter PDF
            </button>
            <button type="button" onClick={() => navigate('/ordonnancement')}
              className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
              <ArrowLeft size={16} /> Retour
            </button>
          </div>
        }
      />

      {/* Statut */}
      <div className="mb-4 flex items-center gap-3">
        <StatutBadge statut={mandat.statut} type="mandat" />
        {mandat.motifRejetTresor && (
          <span className="text-sm text-red-600 italic">Motif : {mandat.motifRejetTresor}</span>
        )}
      </div>

      {/* ─── Actions par statut + rôle ─────────────────────────────── */}
      <div className="mb-6 flex flex-wrap gap-3">
        {isEmis && canTransmit && (
          <>
            <button type="button" onClick={() => setDialog('transmettre')} disabled={isPending}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
              <Send size={16} /> Transmettre au Trésor
            </button>
            <button type="button" onClick={() => setDialog('annuler')} disabled={isPending}
              className="flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50">
              <XCircle size={16} /> Annuler
            </button>
          </>
        )}

        {isTransmis && canPay && (
          <>
            <button type="button" onClick={() => setDialog('paiement')} disabled={isPending}
              className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50">
              <CheckCircle size={16} /> Enregistrer le paiement
            </button>
            <button type="button" onClick={() => setDialog('rejeter')} disabled={isPending}
              className="flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50">
              <XCircle size={16} /> Rejet Trésor
            </button>
          </>
        )}
      </div>

      {/* ─── Corps ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Mandat */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">Mandat de paiement</p>
          <div className="space-y-3 text-sm">
            <LigneInfo label="Numéro">
              <span className="font-mono text-indigo-600">{mandat.numero}</span>
            </LigneInfo>
            <LigneInfo label="Date émission">{formatDate(mandat.dateEmission)}</LigneInfo>
            <LigneInfo label="Bénéficiaire" bold>{mandat.beneficiaire}</LigneInfo>
            <LigneInfo label="Mode paiement">{mandat.modePaiement.replace('_', ' ')}</LigneInfo>
            {mandat.banqueBeneficiaire && <LigneInfo label="Banque">{mandat.banqueBeneficiaire}</LigneInfo>}
            {(mandat.rib || mandat.numeroCompteBeneficiaire) && (
              <LigneInfo label="N° Compte">
                <span className="font-mono text-xs">{mandat.rib ?? mandat.numeroCompteBeneficiaire}</span>
              </LigneInfo>
            )}
            <LigneInfo label="Montant" bold>
              <MontantGNF montant={mandat.montant} taille="md" couleur="success" />
            </LigneInfo>
            {mandat.dateTransmissionTresor && (
              <LigneInfo label="Transmis le">{formatDateTime(mandat.dateTransmissionTresor)}</LigneInfo>
            )}
            {mandat.datePaiement && (
              <LigneInfo label="Payé le">{formatDate(mandat.datePaiement)}</LigneInfo>
            )}
            {mandat.referenceTresor && (
              <LigneInfo label="Réf. Trésor">
                <span className="font-mono text-xs">{mandat.referenceTresor}</span>
              </LigneInfo>
            )}
            {mandat.observations && (
              <div className="border-t border-slate-100 pt-3">
                <p className="text-xs text-slate-500 mb-1">Observations</p>
                <p className="text-slate-700">{mandat.observations}</p>
              </div>
            )}
          </div>
        </div>

        {/* Liquidation / Engagement */}
        {mandat.liquidation && (
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">Liquidation & Engagement</p>
            <div className="space-y-3 text-sm">
              <LigneInfo label="Liquidation">
                <span className="font-mono text-indigo-600">{mandat.liquidation.numero}</span>
              </LigneInfo>
              <LigneInfo label="Montant liquidé">
                <MontantGNF montant={mandat.liquidation.montantNet} taille="sm" />
              </LigneInfo>
              {mandat.liquidation.engagement && (
                <>
                  <div className="border-t border-slate-100 pt-3" />
                  <LigneInfo label="Engagement">
                    <span className="font-mono text-indigo-600">{mandat.liquidation.engagement.numero}</span>
                  </LigneInfo>
                  <div>
                    <p className="text-slate-500 text-xs mb-0.5">Objet</p>
                    <p className="text-slate-800">{mandat.liquidation.engagement.objet}</p>
                  </div>
                  {mandat.liquidation.engagement.fournisseur && (
                    <LigneInfo label="Fournisseur">{mandat.liquidation.engagement.fournisseur}</LigneInfo>
                  )}
                  <LigneInfo label="Montant engagé">
                    <MontantGNF montant={mandat.liquidation.engagement.montantEngage} taille="sm" />
                  </LigneInfo>
                </>
              )}
              {mandat.emetteur && (
                <div className="border-t border-slate-100 pt-3">
                  <LigneInfo label="Émis par">
                    {mandat.emetteur.prenom} {mandat.emetteur.nom}
                    {mandat.emetteur.poste && <span className="text-slate-400"> · {mandat.emetteur.poste}</span>}
                  </LigneInfo>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ─── Dialogues ────────────────────────────────────────────── */}

      <ConfirmDialog
        ouvert={dialog === 'transmettre'}
        titre="Transmettre au Trésor"
        description="Confirmer la transmission du mandat au Trésor public ?"
        onConfirm={() => doAction('transmettre')}
        onCancel={() => setDialog(null)}
        labelConfirm="Transmettre"
      />

      <ConfirmDialog
        ouvert={dialog === 'annuler'}
        titre="Annuler le mandat"
        description="L'annulation est définitive. Confirmer ?"
        onConfirm={() => doAction('annuler')}
        onCancel={() => setDialog(null)}
        variant="danger"
        labelConfirm="Annuler le mandat"
        labelCancel="Non, conserver"
      />

      {/* Dialog paiement */}
      {dialog === 'paiement' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDialog(null)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-4">Enregistrer le paiement</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Date de paiement <span className="text-red-500">*</span>
                </label>
                <input type="date" value={datePaiement} onChange={(e) => setDateP(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Référence Trésor <span className="text-red-500">*</span>
                </label>
                <input type="text" value={referenceTresor} onChange={(e) => setRef(e.target.value)}
                  placeholder="N° virement / quittance"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" onClick={() => setDialog(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700">
                Annuler
              </button>
              <button type="button"
                disabled={!datePaiement || !referenceTresor.trim() || payer.isPending}
                onClick={() => doAction('paiement')}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50">
                {payer.isPending ? 'Enregistrement…' : 'Confirmer le paiement'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog rejet */}
      {dialog === 'rejeter' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDialog(null)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-2">Rejet par le Trésor</h2>
            <p className="text-sm text-slate-500 mb-4">Indiquez le motif du rejet (obligatoire).</p>
            <textarea value={motifRejet} onChange={(e) => setMotif(e.target.value)} rows={3}
              placeholder="Ex : Pièces incomplètes, erreur de montant…"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm resize-none" />
            <div className="mt-4 flex justify-end gap-3">
              <button type="button" onClick={() => setDialog(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700">
                Annuler
              </button>
              <button type="button"
                disabled={!motifRejet.trim() || rejeter.isPending}
                onClick={() => doAction('rejeter')}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
                {rejeter.isPending ? 'Enregistrement…' : 'Enregistrer le rejet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
