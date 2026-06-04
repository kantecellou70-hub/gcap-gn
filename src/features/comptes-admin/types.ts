export interface RALEngagement {
  id: string
  numero: string
  objet: string
  fournisseur?: string
  montantEngage: number
  montantLiquide: number
  ral: number
}

export interface RAPMandat {
  id: string
  numero: string
  liquidationNumero: string
  engagementObjet: string
  beneficiaire: string
  montant: number
  statut: string
  dateEmission: string
}

export interface SyntheseTitre {
  codeTitre: string
  creditsVotes: number
  creditsRevises: number
  montantEngage: number
  montantLiquide: number
  montantOrdonnance: number
}
