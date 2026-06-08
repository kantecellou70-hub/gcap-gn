// Constantes SELECT pour les requêtes Supabase — évite les SELECT * et documente
// explicitement les colonnes utilisées dans chaque contexte d'affichage.

export const ENGAGEMENT_LIST_SELECT = `
  id, tenant_id, numero, exercice_id, ligne_budgetaire_id,
  objet, fournisseur, montant_engage, statut, date_creation,
  created_by, motif_rejet, pieces_jointes, metadata,
  ligne_budgetaire:lignes_budgetaires(id, code_titre, code_chapitre, code_article, libelle, credit_revise, montant_engage)
` as const

export const ENGAGEMENT_DETAIL_SELECT = `
  *,
  ligne_budgetaire:lignes_budgetaires(
    id, code_titre, code_chapitre, code_article, libelle, credit_revise, montant_engage
  ),
  createur:user_profiles!created_by(nom, prenom, poste),
  viseur:user_profiles!vise_par(nom, prenom, poste)
` as const

export const ENGAGEMENT_STATS_SELECT = `
  id, statut, montant_engage
` as const

export const LIQUIDATION_LIST_SELECT = `
  id, tenant_id, engagement_id, numero,
  montant_liquide, retenue_source, penalite_retard, avance_recuperee,
  montant_deductions, montant_net, date_service_fait, reference_pvsf,
  statut, motif_rejet, created_by, created_at, pieces_jointes,
  engagement:engagements_depenses(numero, objet, fournisseur)
` as const

export const LIQUIDATION_DETAIL_SELECT = `
  *,
  engagement:engagements_depenses(
    numero, objet, fournisseur, montant_engage,
    ligne_budgetaire:lignes_budgetaires(code_chapitre, libelle)
  ),
  createur:user_profiles!created_by(nom, prenom),
  valideur:user_profiles!validated_by(nom, prenom)
` as const

export const MANDAT_LIST_SELECT = `
  id, tenant_id, liquidation_id, engagement_id, numero,
  montant, mode_paiement, beneficiaire, statut, date_emission, emis_par,
  liquidation:liquidations(id, numero, montant_net,
    engagement:engagements_depenses(id, numero, objet, fournisseur, montant_engage)
  ),
  emetteur:user_profiles!emis_par(nom, prenom, poste)
` as const

export const NOTIFICATION_SELECT = `
  id, type, titre, message, lu, priorite, lien, metadata, created_at, lu_at
` as const
