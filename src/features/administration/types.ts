import type { Role, UserProfile, ExerciceBudgetaire } from '@/shared/types'

export type { Role, UserProfile, ExerciceBudgetaire }

export interface UtilisateurAvecRoles extends UserProfile {
  actif: boolean
  rolesDetail: { role: Role; actif: boolean }[]
}

export interface InviteInput {
  email: string
  nom: string
  prenom: string
  poste?: string
  role: Role
  motDePasse: string
}

export interface Fournisseur {
  id: string
  tenantId: string
  code: string
  denomination: string
  nif?: string
  rccm?: string
  telephone?: string
  email?: string
  adresse?: string
  banque?: string
  numeroCompte?: string
  actif: boolean
  createdAt: string
}

export interface FournisseurInput {
  code: string
  denomination: string
  nif?: string
  rccm?: string
  telephone?: string
  email?: string
  adresse?: string
  banque?: string
  numeroCompte?: string
  actif?: boolean
}
