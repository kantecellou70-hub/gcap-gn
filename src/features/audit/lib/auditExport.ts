import { jsPDF } from 'jspdf'
import type { AuditLog, AuditFiltres } from '../types'

const FMT_DATE = new Intl.DateTimeFormat('fr-GN', {
  day: '2-digit', month: '2-digit', year: 'numeric',
  hour: '2-digit', minute: '2-digit', second: '2-digit',
})

function formatDate(iso: string): string {
  try { return FMT_DATE.format(new Date(iso)) } catch { return iso }
}

function safeJson(v: Record<string, unknown> | null): string {
  if (!v) return ''
  try { return JSON.stringify(v) } catch { return '' }
}

// ─── CSV ──────────────────────────────────────────────────────────────────────

const CSV_HEADERS = [
  'Date/Heure', 'Utilisateur', 'Action', 'Table', 'ID Enregistrement',
  'Anciennes valeurs', 'Nouvelles valeurs', 'IP', 'Signature', 'Exercice',
]

function csvCell(v: string): string {
  if (v.includes(';') || v.includes('"') || v.includes('\n')) {
    return `"${v.replace(/"/g, '""')}"`
  }
  return v
}

async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function exportAuditCsv(
  entries: AuditLog[],
  tenantNom: string,
  filename?: string
): Promise<void> {
  const now = formatDate(new Date().toISOString())

  const rows: string[] = []
  rows.push(`"JOURNAL D'AUDIT GCAP-GN — Export du ${now} — Tenant : ${tenantNom}"`)
  rows.push(CSV_HEADERS.map(csvCell).join(';'))

  for (const e of entries) {
    rows.push([
      csvCell(formatDate(e.createdAt)),
      csvCell(e.userEmail ?? e.userId ?? 'Système'),
      csvCell(e.action),
      csvCell(e.tableName ?? ''),
      csvCell(e.recordId ?? ''),
      csvCell(safeJson(e.oldValues)),
      csvCell(safeJson(e.newValues)),
      csvCell(e.ipAddress ?? ''),
      csvCell(e.signature ?? ''),
      csvCell(e.exerciceId ?? ''),
    ].join(';'))
  }

  const body = rows.join('\r\n')
  const hash = await sha256Hex(body)
  rows.push(`"Nombre d'entrées : ${entries.length} — Signature de l'export : ${hash}"`)

  const content = '﻿' + rows.join('\r\n')
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename ?? `audit_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── PDF ──────────────────────────────────────────────────────────────────────

const PDF_MAX = 500

// Couleurs drapeau guinéen
const GN_ROUGE  = [206, 17, 38]   as [number, number, number]
const GN_JAUNE  = [252, 209, 22]  as [number, number, number]
const GN_VERT   = [0, 154, 68]    as [number, number, number]

export async function exportAuditPdf(
  entries: AuditLog[],
  tenantNom: string,
  filters: AuditFiltres,
  filename?: string
): Promise<{ truncated: boolean }> {
  const truncated = entries.length > PDF_MAX
  const data = truncated ? entries.slice(0, PDF_MAX) : entries

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()

  // ── Page de couverture ──────────────────────────────────────────────────────
  doc.setFillColor(248, 250, 252)
  doc.rect(0, 0, W, H, 'F')

  // Bandeau tricolore bas
  const bH = 8
  doc.setFillColor(...GN_ROUGE)
  doc.rect(0, H - bH * 3, W, bH, 'F')
  doc.setFillColor(...GN_JAUNE)
  doc.rect(0, H - bH * 2, W, bH, 'F')
  doc.setFillColor(...GN_VERT)
  doc.rect(0, H - bH, W, bH, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.setTextColor(30, 41, 59)
  doc.text("JOURNAL D'AUDIT", W / 2, 50, { align: 'center' })

  doc.setFontSize(16)
  doc.text(tenantNom.toUpperCase(), W / 2, 62, { align: 'center' })

  const periode = [
    filters.dateDebut ? `Du ${filters.dateDebut}` : null,
    filters.dateFin   ? `au ${filters.dateFin}`   : null,
  ].filter(Boolean).join(' ')

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(71, 85, 105)
  if (periode) doc.text(`Période : ${periode}`, W / 2, 76, { align: 'center' })
  doc.text(`Export du : ${formatDate(new Date().toISOString())}`, W / 2, 84, { align: 'center' })
  doc.text(`Nombre d'entrées : ${data.length}${truncated ? ` (limité à ${PDF_MAX})` : ''}`, W / 2, 92, { align: 'center' })

  // Filtres actifs
  const filtreActifs: string[] = []
  if (filters.action)     filtreActifs.push(`Action : ${filters.action}`)
  if (filters.tableName)  filtreActifs.push(`Table : ${filters.tableName}`)
  if (filters.search)     filtreActifs.push(`Recherche : ${filters.search}`)
  if (filtreActifs.length > 0) {
    doc.text(`Filtres : ${filtreActifs.join(' | ')}`, W / 2, 100, { align: 'center' })
  }

  // ── Tableau des entrées ─────────────────────────────────────────────────────
  const COLS = [
    { label: 'Date/Heure',    w: 35 },
    { label: 'Utilisateur',   w: 45 },
    { label: 'Action',        w: 40 },
    { label: 'Table',         w: 38 },
    { label: 'ID',            w: 25 },
    { label: 'Signature',     w: 22 },
  ]
  const ROW_H = 6
  const HEAD_H = 8
  const MARGIN = 10
  const TABLE_W = COLS.reduce((s, c) => s + c.w, 0)

  let pageNum = 1
  let y = 0

  function newPage() {
    doc.addPage()
    pageNum++
    y = MARGIN

    // En-tête tableau
    doc.setFillColor(30, 41, 59)
    doc.rect(MARGIN, y, TABLE_W, HEAD_H, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(255, 255, 255)
    let cx = MARGIN
    for (const col of COLS) {
      doc.text(col.label, cx + 2, y + 5.5)
      cx += col.w
    }
    y += HEAD_H
  }

  function addFooter() {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(7)
    doc.setTextColor(148, 163, 184)
    doc.text(`Page ${pageNum}`, W - MARGIN, H - 5, { align: 'right' })
    doc.text('GCAP-GN — Journal d\'audit', MARGIN, H - 5)
  }

  newPage()

  for (let i = 0; i < data.length; i++) {
    if (y + ROW_H > H - 20) {
      addFooter()
      newPage()
    }

    const e = data[i]
    const even = i % 2 === 0
    doc.setFillColor(even ? 255 : 248, even ? 255 : 250, even ? 255 : 252)
    doc.rect(MARGIN, y, TABLE_W, ROW_H, 'F')

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(30, 41, 59)

    const cells = [
      formatDate(e.createdAt).slice(0, 17),
      (e.userEmail ?? e.userId ?? 'Système').slice(0, 28),
      e.action.slice(0, 24),
      (e.tableName ?? '').slice(0, 22),
      e.recordId ? e.recordId.replace(/-/g, '').slice(0, 8).toUpperCase() : '—',
      e.signature ? (e.signature.slice(0, 8) + '…') : '—',
    ]

    let cx = MARGIN
    for (let ci = 0; ci < COLS.length; ci++) {
      doc.text(cells[ci], cx + 2, y + 4.2)
      cx += COLS[ci].w
    }

    // Séparateur ligne
    doc.setDrawColor(226, 232, 240)
    doc.line(MARGIN, y + ROW_H, MARGIN + TABLE_W, y + ROW_H)

    y += ROW_H
  }

  addFooter()

  doc.save(filename ?? `audit_${new Date().toISOString().slice(0, 10)}.pdf`)

  return { truncated }
}
