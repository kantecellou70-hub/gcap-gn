export type EtatBien = 'BON' | 'ACCEPTABLE' | 'MEDIOCRE' | 'HORS_SERVICE' | 'REFORME'

export type CategorieBien =
  | 'MOBILIER'
  | 'INFORMATIQUE'
  | 'VEHICULE'
  | 'EQUIPEMENT_BUREAU'
  | 'MATERIEL_TECHNIQUE'
  | 'IMMEUBLE'
  | 'AUTRE'

export interface BienAffecte {
  nom: string
  prenom: string
}

export interface BienEngagement {
  numero: string
  objet: string
}

export interface Bien {
  id: string
  codeInventaire: string
  tenantId: string
  designation: string
  categorie: CategorieBien
  marque?: string
  modele?: string
  numeroSerie?: string
  valeurAcquisition: number
  dateAcquisition: string
  engagementId?: string
  localisation: string
  affecteA?: string
  etat: EtatBien
  actif: boolean
  sicomId?: string
  sicomSyncAt?: string
  observations?: string
  createdBy: string
  createdAt: string
  updatedAt: string
  affecte?: BienAffecte
  engagement?: BienEngagement
}

export interface BienInput {
  designation: string
  categorie: CategorieBien
  marque?: string
  modele?: string
  numeroSerie?: string
  valeurAcquisition: number
  dateAcquisition: string
  engagementId?: string
  localisation: string
  affecteA?: string
  etat: EtatBien
  observations?: string
}

export interface BienFiltres {
  categorie?: CategorieBien
  etat?: EtatBien
  affecteA?: string
  search?: string
  actif?: boolean
}

export interface BienParCategorie {
  categorie: CategorieBien
  count: number
  valeurTotale: number
}

export interface SicomSyncResult {
  synchronises: number
  crees: number
  erreurs: string[]
  dateSync: string
}

export interface SicomExportResult {
  exportes: number
  erreurs: string[]
}
