import type { ExecutionMinistere, NationalExercice } from '../types'

const DATE_FR = new Intl.DateTimeFormat('fr-GN', { day: '2-digit', month: '2-digit', year: 'numeric' })

function today(): string {
  return DATE_FR.format(new Date())
}

function todaySlug(): string {
  return new Date().toISOString().slice(0, 10).replace(/-/g, '')
}

// ─── Export Excel (LOLF) ────────────────────────────────────────────────────

export async function exportLolfExcel(
  annee: number,
  data: ExecutionMinistere[]
): Promise<void> {
  const { utils, writeFile } = await import('xlsx')

  const wb = utils.book_new()

  // ── Feuille 1 : Récapitulatif national ──────────────────────────────────
  const rows1: (string | number)[][] = [
    [`TABLEAU D'EXÉCUTION BUDGÉTAIRE — EXERCICE ${annee}`],
    ['République de Guinée — Ministère de l\'Économie et des Finances'],
    [`Date d'édition : ${today()}`],
    [],
    [
      'Code',
      'Ministère',
      'Dotation initiale (GNF)',
      'Crédits consommés (GNF)',
      'Engagements visés (GNF)',
      'Liquidations (GNF)',
      'Mandats émis (GNF)',
      'Mandats payés (GNF)',
      'Taux engagement (%)',
      'Taux exécution (%)',
      'RAP (GNF)',
      'RAL (GNF)',
    ],
  ]

  for (const m of data) {
    rows1.push([
      m.ministere_code,
      m.ministere_nom,
      m.dotation_totale,
      m.credits_consommes,
      m.montant_engage_vise,
      m.montant_liquide,
      m.montant_en_cours_paiement,
      m.montant_paye,
      m.taux_engagement_pct,
      m.taux_execution_pct,
      m.rap,
      m.ral,
    ])
  }

  // Ligne totale
  if (data.length > 0) {
    rows1.push([
      '',
      'TOTAL',
      data.reduce((s, m) => s + m.dotation_totale, 0),
      data.reduce((s, m) => s + m.credits_consommes, 0),
      data.reduce((s, m) => s + m.montant_engage_vise, 0),
      data.reduce((s, m) => s + m.montant_liquide, 0),
      data.reduce((s, m) => s + m.montant_en_cours_paiement, 0),
      data.reduce((s, m) => s + m.montant_paye, 0),
      '',
      '',
      data.reduce((s, m) => s + m.rap, 0),
      data.reduce((s, m) => s + m.ral, 0),
    ])
  }

  const ws1 = utils.aoa_to_sheet(rows1)

  // Largeurs colonnes
  ws1['!cols'] = [
    { wch: 10 }, { wch: 35 },
    { wch: 22 }, { wch: 22 }, { wch: 22 }, { wch: 22 },
    { wch: 22 }, { wch: 22 },
    { wch: 16 }, { wch: 16 },
    { wch: 22 }, { wch: 22 },
  ]

  utils.book_append_sheet(wb, ws1, 'Récapitulatif national')

  // ── Feuille 2 : Recettes ─────────────────────────────────────────────────
  const rows2: (string | number)[][] = [
    [`RECETTES — EXERCICE ${annee}`],
    [`Date d'édition : ${today()}`],
    [],
    ['Code', 'Ministère', 'Recettes constatées (GNF)', 'Recettes recouvrées (GNF)', 'Taux recouvrement (%)'],
  ]

  for (const m of data) {
    const taux = m.recettes_constatees > 0
      ? Math.round((m.recettes_recouvrees / m.recettes_constatees) * 100)
      : 0
    rows2.push([m.ministere_code, m.ministere_nom, m.recettes_constatees, m.recettes_recouvrees, taux])
  }

  if (data.length > 0) {
    const totalConstate  = data.reduce((s, m) => s + m.recettes_constatees, 0)
    const totalRecouvre  = data.reduce((s, m) => s + m.recettes_recouvrees, 0)
    const tauxTotal      = totalConstate > 0 ? Math.round((totalRecouvre / totalConstate) * 100) : 0
    rows2.push(['', 'TOTAL', totalConstate, totalRecouvre, tauxTotal])
  }

  const ws2 = utils.aoa_to_sheet(rows2)
  ws2['!cols'] = [{ wch: 10 }, { wch: 35 }, { wch: 24 }, { wch: 24 }, { wch: 20 }]
  utils.book_append_sheet(wb, ws2, 'Recettes')

  // ── Feuille 3 : Alertes ──────────────────────────────────────────────────
  const alertes = data.filter(
    (m) =>
      m.taux_execution_pct < 25 ||
      m.taux_execution_pct > 95 ||
      m.nb_engagements_en_attente > 10
  )

  const rows3: (string | number | boolean)[][] = [
    [`ALERTES NATIONALES — EXERCICE ${annee}`],
    [`Date d'édition : ${today()}`],
    [],
    ['Ministère', 'Taux exécution (%)', 'Eng. en attente', 'Sous-exécution', 'Sur-exécution', 'Eng. bloqués'],
  ]

  for (const m of alertes) {
    rows3.push([
      m.ministere_nom,
      m.taux_execution_pct,
      m.nb_engagements_en_attente,
      m.taux_execution_pct < 25 ? 'OUI' : 'NON',
      m.taux_execution_pct > 95 ? 'OUI' : 'NON',
      m.nb_engagements_en_attente > 10 ? 'OUI' : 'NON',
    ])
  }

  if (alertes.length === 0) {
    rows3.push(['Aucune alerte active', '', '', '', '', ''])
  }

  const ws3 = utils.aoa_to_sheet(rows3)
  ws3['!cols'] = [{ wch: 35 }, { wch: 18 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 14 }]
  utils.book_append_sheet(wb, ws3, 'Alertes')

  writeFile(wb, `GCAP-GN_LOLF_${annee}_${todaySlug()}.xlsx`)
}

// ─── Export PDF (LOLF) ──────────────────────────────────────────────────────

export async function exportLolfPdf(
  annee: number,
  data: ExecutionMinistere[],
  stats: NationalExercice
): Promise<void> {
  const { default: jsPDF } = await import('jspdf')
  const { autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  // Couleurs drapeau guinéen
  const ROUGE = [206,  17,  38] as [number, number, number]
  const JAUNE = [252, 209,  22] as [number, number, number]
  const VERT  = [  0, 154,  68] as [number, number, number]

  // ── Page de couverture ────────────────────────────────────────────────────
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()

  // Bandeau tricolore en bas
  doc.setFillColor(...ROUGE)
  doc.rect(0, H - 12, W / 3, 12, 'F')
  doc.setFillColor(...JAUNE)
  doc.rect(W / 3, H - 12, W / 3, 12, 'F')
  doc.setFillColor(...VERT)
  doc.rect((W / 3) * 2, H - 12, W / 3, 12, 'F')

  // Bandeau titre en haut
  doc.setFillColor(...VERT)
  doc.rect(0, 0, W, 20, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('RAPPORT D\'EXÉCUTION BUDGÉTAIRE', W / 2, 13, { align: 'center' })

  doc.setTextColor(30, 41, 59)
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text(`Exercice ${annee} — République de Guinée`, W / 2, 45, { align: 'center' })

  doc.setFontSize(13)
  doc.setFont('helvetica', 'normal')
  doc.text('Ministère de l\'Économie, des Finances et du Budget', W / 2, 57, { align: 'center' })

  // KPIs nationaux
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  const kpis = [
    ['Dotation nationale',    formatGNF(stats.dotation_nationale)],
    ['Taux d\'exécution',    `${stats.taux_execution_national_pct}%`],
    ['Montant payé',          formatGNF(stats.montant_paye_national)],
    ['Recettes constatées',   formatGNF(stats.recettes_constatees_national)],
    ['Recettes recouvrées',   formatGNF(stats.recettes_recouvrées_national)],
    ['Ministères actifs',     String(stats.nb_ministeres)],
  ]

  const colW = (W - 40) / 3
  kpis.forEach(([label, value], i) => {
    const col = i % 3
    const row = Math.floor(i / 3)
    const x = 20 + col * colW
    const y = 80 + row * 22

    doc.setFillColor(248, 250, 252)
    doc.roundedRect(x, y, colW - 4, 18, 2, 2, 'F')
    doc.setTextColor(100, 116, 139)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text(label, x + 4, y + 7)
    doc.setTextColor(15, 23, 42)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text(value, x + 4, y + 14)
  })

  doc.setFontSize(8)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(148, 163, 184)
  doc.text(`Édité le ${today()} — GCAP-GN par LYNXA SARL`, W / 2, H - 16, { align: 'center' })

  // ── Page tableau par ministère ────────────────────────────────────────────
  doc.addPage()

  // Bandeau haut
  doc.setFillColor(...VERT)
  doc.rect(0, 0, W, 14, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text(`TABLEAU D'EXÉCUTION BUDGÉTAIRE — EXERCICE ${annee}`, W / 2, 9, { align: 'center' })

  const head = [[
    'Code', 'Ministère', 'Dotation (GNF)', 'Engagé (GNF)', 'Liquidé (GNF)',
    'Payé (GNF)', 'RAP (GNF)', 'RAL (GNF)', 'Tx eng.', 'Tx exec.',
  ]]

  const body = data.map((m) => [
    m.ministere_code,
    m.ministere_nom,
    formatGNF(m.dotation_totale),
    formatGNF(m.montant_engage_vise),
    formatGNF(m.montant_liquide),
    formatGNF(m.montant_paye),
    formatGNF(m.rap),
    formatGNF(m.ral),
    `${m.taux_engagement_pct}%`,
    `${m.taux_execution_pct}%`,
  ])

  // Ligne total
  if (data.length > 0) {
    body.push([
      '',
      'TOTAL',
      formatGNF(data.reduce((s, m) => s + m.dotation_totale, 0)),
      formatGNF(data.reduce((s, m) => s + m.montant_engage_vise, 0)),
      formatGNF(data.reduce((s, m) => s + m.montant_liquide, 0)),
      formatGNF(data.reduce((s, m) => s + m.montant_paye, 0)),
      formatGNF(data.reduce((s, m) => s + m.rap, 0)),
      formatGNF(data.reduce((s, m) => s + m.ral, 0)),
      '',
      `${stats.taux_execution_national_pct}%`,
    ])
  }

  autoTable(doc, {
    head,
    body,
    startY: 18,
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: {
      fillColor: VERT,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 14, halign: 'center' },
      1: { cellWidth: 45 },
      2: { halign: 'right' }, 3: { halign: 'right' },
      4: { halign: 'right' }, 5: { halign: 'right' },
      6: { halign: 'right' }, 7: { halign: 'right' },
      8: { cellWidth: 14, halign: 'center' },
      9: { cellWidth: 14, halign: 'center' },
    },
    didParseCell: (hookData: import('jspdf-autotable').CellHookData) => {
      // Ligne total en gras
      if (hookData.row.index === data.length) {
        hookData.cell.styles.fontStyle = 'bold'
        hookData.cell.styles.fillColor = [241, 245, 249]
      }
      // Colorier le taux d'exécution
      if (hookData.column.index === 9 && hookData.section === 'body') {
        const val = parseInt(String(hookData.cell.raw).replace('%', ''), 10)
        if (!isNaN(val)) {
          if (val >= 75)      hookData.cell.styles.textColor = [  0, 154,  68]
          else if (val < 25)  hookData.cell.styles.textColor = [206,  17,  38]
          else                hookData.cell.styles.textColor = [180, 130,   0]
        }
      }
    },
  })

  // Bandeau tricolore sur chaque page
  const totalPages = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    const h = doc.internal.pageSize.getHeight()
    const w = doc.internal.pageSize.getWidth()
    doc.setFillColor(...ROUGE)
    doc.rect(0, h - 8, w / 3, 8, 'F')
    doc.setFillColor(...JAUNE)
    doc.rect(w / 3, h - 8, w / 3, 8, 'F')
    doc.setFillColor(...VERT)
    doc.rect((w / 3) * 2, h - 8, w / 3, 8, 'F')
  }

  doc.save(`GCAP-GN_LOLF_${annee}_${todaySlug()}.pdf`)
}

// ─── Formatage GNF local (évite l'import circulaire en dehors de React) ──────
function formatGNF(n: number): string {
  return new Intl.NumberFormat('fr-GN', {
    style: 'currency',
    currency: 'GNF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n)
}
