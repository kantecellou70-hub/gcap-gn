export type TypeCredit = 'FONCTIONNEMENT' | 'INVESTISSEMENT' | 'TRANSFERT'

export interface LigneBudgetaire {
  id: string
  tenantId: string
  exerciceId: string
  exerciceAnnee: number
  exerciceStatut: string
  codeTitre: string
  codeChapitre: string
  codeArticle: string
  codeParagraphe?: string
  libelle: string
  typeCredit: TypeCredit
  creditInitial: number
  creditRevise: number
  montantEngage: number
  montantLiquide: number
  montantOrdonnance: number
  creditDisponible: number
  tauxConsommation: number
  createdAt: string
}

export interface LigneBudgetaireInput {
  exerciceId: string
  codeTitre: string
  codeChapitre: string
  codeArticle: string
  codeParagraphe?: string
  libelle: string
  typeCredit: TypeCredit
  creditInitial: number
}

export interface ModifCredit {
  ligneId: string
  creditRevise: number
  motif: string
}

export interface StatsBudget {
  totalCredits: number
  totalEngage: number
  totalLiquide: number
  totalOrdonnance: number
  totalDisponible: number
  tauxConsommationGlobal: number
}
