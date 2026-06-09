// ─── Types M9 — Consolidation nationale ─────────────────────────────────────
// Tous les montants sont en GNF (INTEGER), les taux en entiers 0-100

export interface ExecutionMinistere {
  tenant_id: string
  ministere_nom: string
  ministere_code: string
  exercice_id: string
  annee: number
  exercice_statut: string
  dotation_totale: number
  credits_consommes: number
  nb_engagements_vises: number
  montant_engage_vise: number
  nb_engagements_en_attente: number
  montant_liquide: number
  montant_paye: number
  montant_en_cours_paiement: number
  recettes_constatees: number
  recettes_recouvrees: number
  taux_execution_pct: number
  taux_engagement_pct: number
  // Calculés côté client
  ral: number  // Restes à Liquider = montant_engage_vise - montant_liquide
  rap: number  // Restes à Payer    = montant_en_cours_paiement
}

export interface AlerteNationale {
  tenant_id: string
  ministere_nom: string
  ministere_code: string
  exercice_id: string
  annee: number
  taux_execution_pct: number
  taux_engagement_pct: number
  nb_engagements_en_attente: number
  alerte_sous_execution: boolean
  alerte_sur_execution: boolean
  alerte_engagements_bloques: boolean
}

export interface NationalExercice {
  annee: number
  nb_ministeres: number
  dotation_nationale: number
  credits_consommes_national: number
  montant_engage_national: number
  montant_liquide_national: number
  montant_paye_national: number
  recettes_constatees_national: number
  recettes_recouvrées_national: number
  taux_execution_national_pct: number
}

export interface EvolutionMensuelle {
  mois: number
  montant_paye: number
  montant_engage: number
}
