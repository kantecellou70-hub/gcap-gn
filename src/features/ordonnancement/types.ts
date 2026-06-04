import type { StatutMandat, ModePaiement } from '@/shared/types'

export type { StatutMandat, ModePaiement }

export interface MandatEngagement {
  id: string
  numero: string
  objet: string
  fournisseur?: string
  montantEngage: number
}

export interface MandatLiquidation {
  id: string
  numero: string
  montantNet: number
  engagement?: MandatEngagement
}

export interface MandatEmetteur {
  nom: string
  prenom: string
  poste?: string
}

export interface MandatPaiement {
  id: string
  tenantId: string
  liquidationId: string
  engagementId?: string
  numero: string
  montant: number
  modePaiement: ModePaiement
  beneficiaire: string
  rib?: string
  banqueBeneficiaire?: string
  numeroCompteBeneficiaire?: string
  observations?: string
  statut: StatutMandat
  dateEmission: string
  emisPar: string
  dateTransmissionTresor?: string
  datePaiement?: string
  referenceTresor?: string
  motifRejetTresor?: string
  liquidation?: MandatLiquidation
  emetteur?: MandatEmetteur
}

export interface MandatInput {
  liquidationId: string
  montant: number
  modePaiement: ModePaiement
  beneficiaire: string
  rib?: string
  banqueBeneficiaire?: string
  numeroCompteBeneficiaire?: string
  observations?: string
}

export interface EnregistrerPaiementInput {
  datePaiement: string
  referenceTresor: string
}

export interface MandatFiltres {
  statut?: StatutMandat
  search?: string
}

export interface LiquidationValidee {
  id: string
  numero: string
  montantNet: number
  engagement?: {
    id: string
    numero: string
    objet: string
    fournisseur?: string
  }
}
