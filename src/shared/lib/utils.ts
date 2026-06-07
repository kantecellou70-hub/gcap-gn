import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { StatutEngagement, Role } from '../types'

// ─── Classnames (Tailwind) ──────────────────────────────────────────────────

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

// ─── Formatage des montants GNF ─────────────────────────────────────────────

export function formatGNF(montant: number): string {
  return new Intl.NumberFormat('fr-GN', {
    style: 'currency',
    currency: 'GNF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(montant)
}

// ─── Formatage des dates ────────────────────────────────────────────────────

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  return new Intl.DateTimeFormat('fr-GN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(dateStr))
}

export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  return new Intl.DateTimeFormat('fr-GN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr))
}

// ─── Numérotation des pièces ────────────────────────────────────────────────

type PieceType = 'ENG' | 'LIQ' | 'MAN'

export function genererNumeroPiece(
  type: PieceType,
  annee: number,
  codeMinistere: string,
  sequence: number
): string {
  const seq = String(sequence).padStart(5, '0')
  return `${type}-${annee}-${codeMinistere.toUpperCase()}-${seq}`
}

// ─── Statuts ────────────────────────────────────────────────────────────────

export const STATUT_LABELS: Record<StatutEngagement, string> = {
  BROUILLON:       'Brouillon',
  EN_ATTENTE_VISA: 'En attente de visa',
  VISE:            'Visé',
  REJETE:          'Rejeté',
  LIQUIDE:         'Liquidé',
  ORDONNANCE:      'Ordonnancé',
  ANNULE:          'Annulé',
}

export const STATUT_COLORS: Record<StatutEngagement, string> = {
  BROUILLON:       'bg-slate-100 text-slate-600',
  EN_ATTENTE_VISA: 'bg-accent-300 text-amber-800',
  VISE:            'bg-success-100 text-success-500',
  REJETE:          'bg-danger-100 text-danger-500',
  LIQUIDE:         'bg-primary-100 text-primary-500',
  ORDONNANCE:      'bg-primary-100 text-primary-700',
  ANNULE:          'bg-gray-100 text-gray-500',
}

// ─── Permissions ─────────────────────────────────────────────────────────────

const ROLE_PERMISSIONS: Record<string, Role[]> = {
  'engagement.create':   ['SUPER_ADMIN', 'DAFF', 'SAFF'],
  'engagement.validate': ['SUPER_ADMIN', 'ORDONNATEUR', 'DAFF'],
  'engagement.visa':     ['SUPER_ADMIN', 'CF'],
  'engagement.reject':   ['SUPER_ADMIN', 'CF'],
  'liquidation.create':  ['SUPER_ADMIN', 'DAFF', 'SAFF'],
  // LOLF guinéenne : la validation de liquidation est une fonction comptable (DAFF).
  // L'ORDONNATEUR ordonnance (mandats), il ne liquide pas.
  'liquidation.validate':['SUPER_ADMIN', 'DAFF'],
  'mandat.emit':         ['SUPER_ADMIN', 'ORDONNATEUR', 'DAFF'],
  'budget.modify':       ['SUPER_ADMIN', 'ADMIN_MINISTERE', 'DAFF'],
  'users.manage':        ['SUPER_ADMIN', 'ADMIN_MINISTERE'],
  'audit.consulter':     ['SUPER_ADMIN', 'ADMIN_MINISTERE', 'AUDITEUR', 'CF'],
  // M6 — Comptabilité matières
  'matieres.gerer':      ['SUPER_ADMIN', 'ADMIN_MINISTERE', 'COMPTABLE_MATIERES'],
  'matieres.valider':    ['SUPER_ADMIN', 'ADMIN_MINISTERE'],
  'inventaire.clore':    ['SUPER_ADMIN', 'ADMIN_MINISTERE', 'COMPTABLE_MATIERES'],
}

export function canDo(action: string, userRoles: Role[]): boolean {
  const allowedRoles = ROLE_PERMISSIONS[action] ?? []
  return userRoles.some((role) => allowedRoles.includes(role))
}

// ─── Calculs budgétaires ─────────────────────────────────────────────────────

export function calculerCreditDisponible(
  creditRevise: number,
  montantEngage: number
): number {
  return Math.max(0, creditRevise - montantEngage)
}

export function calculerTauxConsommation(
  montantOrdonnance: number,
  creditRevise: number
): number {
  if (creditRevise === 0) return 0
  return Math.round((montantOrdonnance / creditRevise) * 100 * 10) / 10
}
