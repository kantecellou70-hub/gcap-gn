export type TypeRecette = 'REDEVANCE' | 'VENTE_SERVICE' | 'REMBOURSEMENT' | 'DON' | 'AUTRE'
export type StatutRecette = 'PREVUE' | 'CONSTATEE' | 'RECOUVREE' | 'ANNULEE'

export interface RecetteCreateur {
  nom: string
  prenom: string
}

export interface Recette {
  id: string
  tenantId: string
  exerciceId: string
  ligneBudgetaireId?: string
  numero: string
  typeRecette: TypeRecette
  libelle: string
  montantPrevu: number
  montantConstate: number
  montantRecouvre: number
  debiteur: string
  dateConstatation?: string
  observations?: string
  statut: StatutRecette
  createdBy?: string
  createdAt: string
  createur?: RecetteCreateur
}

export interface RecetteInput {
  typeRecette: TypeRecette
  libelle: string
  montantPrevu: number
  debiteur: string
  exerciceId: string
  ligneBudgetaireId?: string
  dateConstatation?: string
  observations?: string
}

export interface RecetteFiltres {
  statut?: StatutRecette
  typeRecette?: TypeRecette
  search?: string
}
