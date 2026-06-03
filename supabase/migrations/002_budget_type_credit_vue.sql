-- ═══════════════════════════════════════════════════════════
-- GCAP-GN — Migration 002 : Enrichissement module Budget
-- LYNXA SARL — Juin 2026
-- ═══════════════════════════════════════════════════════════

-- 1. Colonne type_credit sur lignes_budgetaires
ALTER TABLE lignes_budgetaires
  ADD COLUMN IF NOT EXISTS type_credit VARCHAR(20) NOT NULL DEFAULT 'FONCTIONNEMENT'
    CHECK (type_credit IN ('FONCTIONNEMENT', 'INVESTISSEMENT', 'TRANSFERT'));

-- 2. Vue calculée : crédits disponibles + taux de consommation
CREATE OR REPLACE VIEW vue_credits_disponibles AS
SELECT
  lb.id,
  lb.tenant_id,
  lb.exercice_id,
  lb.code_titre,
  lb.code_chapitre,
  lb.code_article,
  lb.code_paragraphe,
  lb.libelle,
  lb.type_credit,
  lb.credit_initial,
  lb.credit_revise,
  lb.montant_engage,
  lb.montant_liquide,
  lb.montant_ordonnance,
  lb.created_at,
  -- Calculé
  (lb.credit_revise - lb.montant_engage)                                AS credit_disponible,
  CASE WHEN lb.credit_revise > 0
    THEN ROUND((lb.montant_ordonnance::numeric / lb.credit_revise) * 100, 1)
    ELSE 0
  END                                                                   AS taux_consommation,
  -- Exercice
  eb.annee                                                              AS exercice_annee,
  eb.statut                                                             AS exercice_statut
FROM lignes_budgetaires lb
JOIN exercices_budgetaires eb ON eb.id = lb.exercice_id;

-- RLS héritée de la table via security_invoker
ALTER VIEW vue_credits_disponibles SET (security_invoker = true);
