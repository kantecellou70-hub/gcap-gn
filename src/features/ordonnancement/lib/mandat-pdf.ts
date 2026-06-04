import { jsPDF } from 'jspdf'
import type { MandatPaiement } from '../types'

function fmt(n: number) {
  return new Intl.NumberFormat('fr-GN').format(n) + ' GNF'
}
function fmtDate(d?: string) {
  if (!d) return '—'
  return new Intl.DateTimeFormat('fr-GN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(d))
}

export function generateMandatPdf(mandat: MandatPaiement, nomMinistere: string): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = 210, marginL = 20, marginR = 20, textW = W - marginL - marginR
  let y = 20

  // ── En-tête ───────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('RÉPUBLIQUE DE GUINÉE', W / 2, y, { align: 'center' })
  y += 6
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('Travail — Justice — Solidarité', W / 2, y, { align: 'center' })
  y += 8
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text(nomMinistere.toUpperCase(), W / 2, y, { align: 'center' })
  y += 6
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('GCAP-GN — Gestion Comptable Administrative Publique', W / 2, y, { align: 'center' })

  // Ligne de séparation
  y += 6
  doc.setLineWidth(0.5)
  doc.line(marginL, y, W - marginR, y)
  y += 8

  // Titre document
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text(`MANDAT DE PAIEMENT N° ${mandat.numero}`, W / 2, y, { align: 'center' })
  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(`Date d'émission : ${fmtDate(mandat.dateEmission)}`, W / 2, y, { align: 'center' })
  y += 10

  // ── Tableau informations ──────────────────────────────────────────────────
  const rows: [string, string][] = [
    ['Bénéficiaire',         mandat.beneficiaire],
    ['Montant à payer',      fmt(mandat.montant)],
    ['Mode de paiement',     mandat.modePaiement.replace('_', ' ')],
  ]

  if (mandat.banqueBeneficiaire)        rows.push(['Banque',  mandat.banqueBeneficiaire])
  if (mandat.rib || mandat.numeroCompteBeneficiaire)
    rows.push(['N° Compte', mandat.rib ?? mandat.numeroCompteBeneficiaire ?? ''])
  if (mandat.liquidation) {
    rows.push(['Référence liquidation', mandat.liquidation.numero])
    if (mandat.liquidation.engagement) {
      rows.push(['Référence engagement', mandat.liquidation.engagement.numero])
      rows.push(['Objet',                mandat.liquidation.engagement.objet])
    }
  }
  if (mandat.observations) rows.push(['Observations', mandat.observations])

  const col1 = 55
  doc.setFillColor(248, 250, 252)
  rows.forEach(([label, value], i) => {
    const rowH = 8
    if (i % 2 === 0) {
      doc.setFillColor(248, 250, 252)
      doc.rect(marginL, y - 4, textW, rowH, 'F')
    }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.text(label + ' :', marginL + 2, y)
    doc.setFont('helvetica', 'normal')
    const wrapped = doc.splitTextToSize(value, textW - col1 - 4)
    doc.text(wrapped, marginL + col1, y)
    y += Math.max(rowH, wrapped.length * 5)
  })

  y += 4
  doc.setLineWidth(0.3)
  doc.line(marginL, y, W - marginR, y)
  y += 10

  // ── Zones de signature ────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  const sigW = (textW - 10) / 2
  const xLeft = marginL, xRight = marginL + sigW + 10

  doc.text("L'ORDONNATEUR", xLeft + sigW / 2, y, { align: 'center' })
  doc.text("LE COMPTABLE PUBLIC", xRight + sigW / 2, y, { align: 'center' })
  y += 4
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text('Nom & Signature', xLeft + sigW / 2, y, { align: 'center' })
  doc.text('Nom & Signature', xRight + sigW / 2, y, { align: 'center' })

  // Boîtes de signature
  y += 3
  doc.setLineWidth(0.3)
  doc.rect(xLeft, y, sigW, 25)
  doc.rect(xRight, y, sigW, 25)
  y += 25 + 10

  // ── Pied de page ──────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(7)
  doc.setTextColor(150, 150, 150)
  doc.text(
    `Document généré par GCAP-GN le ${fmtDate(new Date().toISOString())} — Ministère des Finances — République de Guinée`,
    W / 2,
    285,
    { align: 'center' }
  )

  doc.save(`Mandat_${mandat.numero.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`)
}
