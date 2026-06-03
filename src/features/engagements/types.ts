import type { StatutEngagement } from '@/shared/types'

export type { StatutEngagement }

export interface EngagementFiltres {
  statut?: StatutEngagement
  exerciceId?: string
  search?: string
}

export interface EngagementLigne {
  id: string
  codeTitre: string
  codeChapitre: string
  codeArticle: string
  libelle: string
  creditRevise: number
  montantEngage: number
  creditDisponible: number
}

export interface EngagementCreateur {
  nom: string
  prenom: string
  poste?: string
}

export interface Engagement {
  id: string
  tenantId: string
  numero: string
  exerciceId: string
  ligneBudgetaireId: string
  objet: string
  fournisseur?: string
  referenceMarche?: string
  referenceBonCmd?: string
  dateEcheance?: string
  observations?: string
  montantEngage: number
  statut: StatutEngagement
  dateCreation: string
  createdBy: string
  dateVisaCf?: string
  visePar?: string
  motifRejet?: string
  piecesJointes: PieceJointe[]
  metadata: Record<string, unknown>
  ligneBudgetaire?: EngagementLigne
  createur?: EngagementCreateur
  viseur?: EngagementCreateur
}

export interface PieceJointe {
  nom: string
  url: string
  taille: number
  type: string
  uploadedAt: string
}

export interface EngagementInput {
  objet: string
  exerciceId: string
  ligneBudgetaireId: string
  fournisseur?: string
  referenceMarche?: string
  referenceBonCmd?: string
  dateEcheance?: string
  observations?: string
  montantEngage: number
}

export interface VisaInput {
  engagementId: string
  decision: 'VISE' | 'REJETE'
  motifRejet?: string
}
