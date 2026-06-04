import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import type { Engagement } from '@/shared/types'
import type { LigneBudgetaire } from '@/features/budget/types'
import type { ExerciceBudgetaire, Tenant } from '@/shared/types'

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmtGNF(n: number) {
  return new Intl.NumberFormat('fr-GN').format(n) + ' GNF'
}
function fmtDate(d?: string) {
  if (!d) return '—'
  return new Intl.DateTimeFormat('fr-GN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(d))
}

// ─── Excel exports ────────────────────────────────────────────────────────────

export function exporterEngagementsExcel(engagements: Engagement[], filename = 'engagements.xlsx'): void {
  const headers = ['Numéro', 'Objet', 'Fournisseur', 'Montant (GNF)', 'Statut', 'Date création']
  const rows = engagements.map((e) => [
    e.numero,
    e.objet,
    e.fournisseur ?? '',
    e.montantEngage,
    e.statut,
    fmtDate(e.dateCreation),
  ])

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])

  // Largeurs colonnes
  ws['!cols'] = [{ wch: 22 }, { wch: 50 }, { wch: 30 }, { wch: 18 }, { wch: 18 }, { wch: 14 }]

  XLSX.utils.book_append_sheet(wb, ws, 'Engagements')
  XLSX.writeFile(wb, filename)
}

export function exporterBudgetExcel(lignes: LigneBudgetaire[], exercice: string, filename = 'budget.xlsx'): void {
  const headers = [
    'Code', 'Libellé', 'Type', 'Crédit initial (GNF)', 'Crédit révisé (GNF)',
    'Engagé (GNF)', 'Liquidé (GNF)', 'Ordonnancé (GNF)', 'Disponible (GNF)', 'Taux (%)',
  ]
  const rows = lignes.map((l) => [
    `${l.codeTitre}.${l.codeChapitre}.${l.codeArticle}`,
    l.libelle,
    l.typeCredit,
    l.creditInitial,
    l.creditRevise,
    l.montantEngage,
    l.montantLiquide,
    l.montantOrdonnance,
    l.creditDisponible,
    l.tauxConsommation,
  ])

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
  ws['!cols'] = [
    { wch: 18 }, { wch: 55 }, { wch: 18 }, { wch: 22 }, { wch: 22 },
    { wch: 22 }, { wch: 22 }, { wch: 22 }, { wch: 22 }, { wch: 10 },
  ]

  XLSX.utils.book_append_sheet(wb, ws, `Budget ${exercice}`)
  XLSX.writeFile(wb, filename)
}

// ─── PDF compte administratif ─────────────────────────────────────────────────

export function exporterComptesAdminPDF(
  exercice: ExerciceBudgetaire,
  tenant: Tenant,
  lignes: LigneBudgetaire[]
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = 210, marginL = 15, marginR = 15, textW = W - marginL - marginR
  let y = 18

  // ── En-tête officiel ──────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('RÉPUBLIQUE DE GUINÉE', W / 2, y, { align: 'center' })
  y += 5
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text('Travail — Justice — Solidarité', W / 2, y, { align: 'center' })
  y += 7
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text(tenant.nom.toUpperCase(), W / 2, y, { align: 'center' })
  y += 5
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text('GCAP-GN — Gestion Comptable Administrative Publique', W / 2, y, { align: 'center' })
  y += 6
  doc.setLineWidth(0.5)
  doc.line(marginL, y, W - marginR, y)
  y += 8

  // ── Titre document ────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text(`COMPTE ADMINISTRATIF — EXERCICE ${exercice.annee}`, W / 2, y, { align: 'center' })
  y += 5
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text(
    `Période : ${fmtDate(exercice.dateOuverture)} → ${exercice.dateCloture ? fmtDate(exercice.dateCloture) : 'En cours'}`,
    W / 2, y, { align: 'center' }
  )
  y += 10

  // ── Récapitulatif totaux ──────────────────────────────────────────────────
  const totaux = lignes.reduce(
    (acc, l) => ({
      credits:    acc.credits    + l.creditRevise,
      engage:     acc.engage     + l.montantEngage,
      liquide:    acc.liquide    + l.montantLiquide,
      ordonnance: acc.ordonnance + l.montantOrdonnance,
    }),
    { credits: 0, engage: 0, liquide: 0, ordonnance: 0 }
  )

  const recapRows: [string, string][] = [
    ['Crédits ouverts',    fmtGNF(totaux.credits)],
    ['Montants engagés',   fmtGNF(totaux.engage)],
    ['Montants liquidés',  fmtGNF(totaux.liquide)],
    ['Montants ordonnancés', fmtGNF(totaux.ordonnance)],
    ['Disponible',         fmtGNF(Math.max(0, totaux.credits - totaux.engage))],
    ['Taux d\'exécution',  totaux.credits > 0 ? `${Math.round(totaux.ordonnance / totaux.credits * 100)}%` : '0%'],
  ]

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('RÉCAPITULATIF GÉNÉRAL', marginL, y)
  y += 5

  recapRows.forEach(([label, val], i) => {
    if (i % 2 === 0) {
      doc.setFillColor(248, 250, 252)
      doc.rect(marginL, y - 4, textW, 7, 'F')
    }
    doc.setFont('helvetica', i < 4 ? 'normal' : 'bold')
    doc.setFontSize(8)
    doc.text(label, marginL + 2, y)
    doc.text(val, W - marginR - 2, y, { align: 'right' })
    y += 7
  })
  y += 5

  // ── Tableau par titre budgétaire ──────────────────────────────────────────
  // Grouper par codeTitre
  const parTitre = new Map<string, { engage: number; ordonnance: number; credits: number }>()
  for (const l of lignes) {
    const cur = parTitre.get(l.codeTitre) ?? { engage: 0, ordonnance: 0, credits: 0 }
    cur.engage     += l.montantEngage
    cur.ordonnance += l.montantOrdonnance
    cur.credits    += l.creditRevise
    parTitre.set(l.codeTitre, cur)
  }

  if (parTitre.size > 0) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.text('EXÉCUTION PAR TITRE', marginL, y)
    y += 5

    // En-têtes tableau
    const cols = { titre: 30, credits: 45, engage: 45, ordonnance: 45, taux: 20 }
    doc.setFillColor(79, 70, 229)
    doc.rect(marginL, y - 4, textW, 7, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.text('Titre', marginL + 2, y)
    doc.text('Crédits', marginL + cols.titre, y)
    doc.text('Engagé', marginL + cols.titre + cols.credits, y)
    doc.text('Ordonnancé', marginL + cols.titre + cols.credits + cols.engage, y)
    doc.text('%', W - marginR - 5, y, { align: 'right' })
    y += 7
    doc.setTextColor(0, 0, 0)

    let idx = 0
    for (const [titre, vals] of parTitre.entries()) {
      if (idx % 2 === 0) {
        doc.setFillColor(248, 250, 252)
        doc.rect(marginL, y - 4, textW, 7, 'F')
      }
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      const taux = vals.credits > 0 ? Math.round(vals.ordonnance / vals.credits * 100) : 0
      doc.text(`Titre ${titre}`, marginL + 2, y)
      doc.text(fmtGNF(vals.credits),    marginL + cols.titre + 2, y)
      doc.text(fmtGNF(vals.engage),     marginL + cols.titre + cols.credits + 2, y)
      doc.text(fmtGNF(vals.ordonnance), marginL + cols.titre + cols.credits + cols.engage + 2, y)
      doc.text(`${taux}%`, W - marginR - 2, y, { align: 'right' })
      y += 7
      idx++

      if (y > 260) {
        doc.addPage()
        y = 20
      }
    }
    y += 5
  }

  // ── Zone de signature ─────────────────────────────────────────────────────
  const sigY = Math.max(y + 10, 240)
  const sigW = (textW - 10) / 2
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.text("L'ORDONNATEUR", marginL + sigW / 2, sigY, { align: 'center' })
  doc.text("LE COMPTABLE PUBLIC", marginL + sigW + 10 + sigW / 2, sigY, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.text('Nom & Signature', marginL + sigW / 2, sigY + 4, { align: 'center' })
  doc.text('Nom & Signature', marginL + sigW + 10 + sigW / 2, sigY + 4, { align: 'center' })
  doc.setLineWidth(0.3)
  doc.rect(marginL, sigY + 6, sigW, 22)
  doc.rect(marginL + sigW + 10, sigY + 6, sigW, 22)

  // ── Pied de page ──────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(6)
  doc.setTextColor(150, 150, 150)
  doc.text(
    `République de Guinée — ${tenant.nom} — Exercice ${exercice.annee} — Généré le ${fmtDate(new Date().toISOString())}`,
    W / 2, 290, { align: 'center' }
  )

  doc.save(`Compte_Administratif_${exercice.annee}_${tenant.code}.pdf`)
}
