// ─── Tenant ────────────────────────────────────────────────────────────────

export type TenantType = 'MINISTERE' | 'EPA' | 'DIRECTION'

export interface Tenant {
  id: string
  code: string
  nom: string
  type: TenantType
  statut: 'ACTIF' | 'SUSPENDU'
  createdAt: string
}

// ─── Rôles ─────────────────────────────────────────────────────────────────

export type Role =
  | 'SUPER_ADMIN'
  | 'ADMIN_MINISTERE'
  | 'ORDONNATEUR'
  | 'DAFF'
  | 'SAFF'
  | 'CF'
  | 'COMPTABLE_MATIERES'
  | 'AUDITEUR'
  | 'GESTIONNAIRE_BUDGET'

export interface UserProfile {
  id: string
  tenantId: string
  nom: string
  prenom: string
  matricule?: string
  poste?: string
  telephone?: string
  roles: Role[]
  createdAt: string
}

// ─── Budget ────────────────────────────────────────────────────────────────

export type StatutExercice = 'OUVERT' | 'CLOTURE' | 'ARCHIVE'

export interface ExerciceBudgetaire {
  id: string
  tenantId: string
  annee: number
  statut: StatutExercice
  dateOuverture: string
  dateCloture?: string
}

export interface LigneBudgetaire {
  id: string
  tenantId: string
  exerciceId: string
  codeTitre: string
  codeChapitre: string
  codeArticle: string
  codeParagraphe?: string
  libelle: string
  creditInitial: number       // En GNF — INTEGER
  creditRevise: number        // En GNF — INTEGER
  montantEngage: number       // En GNF — INTEGER
  montantLiquide: number      // En GNF — INTEGER
  montantOrdonnance: number   // En GNF — INTEGER
  // Calculé côté client :
  creditDisponible: number    // = creditRevise - montantEngage
  tauxConsommation: number    // = montantOrdonnance / creditRevise * 100
}

// ─── Engagement ────────────────────────────────────────────────────────────

export type StatutEngagement =
  | 'BROUILLON'
  | 'EN_ATTENTE_VISA'
  | 'VISE'
  | 'REJETE'
  | 'LIQUIDE'
  | 'ORDONNANCE'
  | 'ANNULE'

export interface PieceJointe {
  nom: string
  url: string
  taille: number
  type: string
  uploadedAt: string
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
  montantEngage: number       // En GNF — INTEGER
  statut: StatutEngagement
  dateCreation: string
  createdBy: string
  dateVisaCf?: string
  visePar?: string
  motifRejet?: string
  piecesJointes: PieceJointe[]
  // Relations (joins)
  ligneBudgetaire?: Pick<LigneBudgetaire, 'codeChapitre' | 'libelle'>
  createur?: Pick<UserProfile, 'nom' | 'prenom'>
}

// ─── Liquidation ───────────────────────────────────────────────────────────

export interface Liquidation {
  id: string
  tenantId: string
  engagementId: string
  numero: string
  montantLiquide: number
  dateServiceFait: string
  referencePvsf?: string
  montantDeductions: number
  montantNet: number
  statut: 'EN_COURS' | 'VALIDEE' | 'ANNULEE'
  createdBy: string
  createdAt: string
  piecesJointes: PieceJointe[]
}

// ─── Mandat ─────────────────────────────────────────────────────────────────

export type ModePaiement = 'VIREMENT' | 'CHEQUE' | 'CAISSE'

export type StatutMandat =
  | 'EMIS'
  | 'TRANSMIS_TRESOR'
  | 'PRIS_EN_CHARGE'
  | 'PAYE'
  | 'REJETE'

export interface MandatPaiement {
  id: string
  tenantId: string
  liquidationId: string
  numero: string
  montant: number
  modePaiement: ModePaiement
  beneficiaire: string
  rib?: string
  statut: StatutMandat
  dateEmission: string
  emisPar: string
  dateTransmissionTresor?: string
  motifRejetTresor?: string
}

// ─── Utilitaires ───────────────────────────────────────────────────────────

export interface PaginationParams {
  page: number
  pageSize: number
}

export interface ApiResponse<T> {
  data: T
  count?: number
  error?: string
}

export interface SelectOption {
  value: string
  label: string
}
