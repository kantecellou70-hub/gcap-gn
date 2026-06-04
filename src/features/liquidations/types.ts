import type { PieceJointe } from '@/shared/types'

export type StatutLiquidation = 'BROUILLON' | 'SOUMISE' | 'VALIDEE' | 'REJETEE' | 'ANNULEE'

export interface LiquidationEngagement {
  numero: string
  objet: string
  fournisseur?: string
  montantEngage: number
  ligneBudgetaire?: { codeChapitre: string; libelle: string }
}

export interface LiquidationCreateur {
  nom: string
  prenom: string
}

export interface Liquidation {
  id: string
  tenantId: string
  engagementId: string
  numero: string
  // montant_liquide (DB) = montant brut avant déductions
  montantBrut: number
  retenuSource: number
  penaliteRetard: number
  avanceRecuperee: number
  montantDeductions: number   // = retenuSource + penaliteRetard + avanceRecuperee
  montantNet: number
  dateServiceFait: string
  referencePvsf: string
  dateFacture?: string
  numeroFacture?: string
  statut: StatutLiquidation
  motifRejet?: string
  createdBy: string
  createdAt: string
  validatedBy?: string
  piecesJointes: PieceJointe[]
  engagement?: LiquidationEngagement
  createur?: LiquidationCreateur
  valideur?: LiquidationCreateur
}

export interface LiquidationInput {
  engagementId: string
  montantBrut: number
  retenuSource: number
  penaliteRetard: number
  avanceRecuperee: number
  dateServiceFait: string
  referencePvsf: string
  dateFacture?: string
  numeroFacture?: string
  observations?: string
}

export interface LiquidationFiltres {
  statut?: StatutLiquidation
  engagementId?: string
  search?: string
}

export interface EngagementVise {
  id: string
  numero: string
  objet: string
  fournisseur?: string
  montantEngage: number
  dejaLiquide: number
  resteALiquider: number
}
