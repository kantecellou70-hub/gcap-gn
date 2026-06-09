BEGIN;

-- ============================================================
-- M9 — Consolidation nationale MEFB
-- Vues cross-tenants accessibles uniquement au SUPER_ADMIN
-- Sécurité : RoleGuard React + canDo('consolidation.nationale')
--
-- Schéma réel (important) :
--   liquidations   → pas de exercice_id, lien via engagement_id
--   mandats_paiement → pas de exercice_id, colonne = montant (pas montant_net)
--                      lien via liquidation_id → engagement_id → exercice_id
-- ============================================================

-- 1. Vue d'exécution budgétaire par ministère et exercice
CREATE OR REPLACE VIEW v_execution_nationale AS
WITH
  -- Liquidations agrégées par (tenant, exercice) via la chaîne engagement
  liq_par_exercice AS (
    SELECT
      eng.tenant_id,
      eng.exercice_id,
      SUM(liq.montant_net) FILTER (WHERE liq.statut = 'VALIDEE') AS montant_liquide
    FROM liquidations liq
    JOIN engagements_depenses eng ON eng.id = liq.engagement_id
    GROUP BY eng.tenant_id, eng.exercice_id
  ),
  -- Mandats agrégés par (tenant, exercice) via liquidation → engagement
  mp_par_exercice AS (
    SELECT
      mp.tenant_id,
      eng.exercice_id,
      SUM(mp.montant) FILTER (WHERE mp.statut = 'PAYE')          AS montant_paye,
      SUM(mp.montant) FILTER (WHERE mp.statut = 'EMIS')          AS montant_en_cours_paiement
    FROM mandats_paiement mp
    JOIN liquidations liq ON liq.id = mp.liquidation_id
    JOIN engagements_depenses eng ON eng.id = liq.engagement_id
    GROUP BY mp.tenant_id, eng.exercice_id
  )
SELECT
  t.id                                          AS tenant_id,
  t.nom                                         AS ministere_nom,
  t.code                                        AS ministere_code,
  e.id                                          AS exercice_id,
  e.annee,
  e.statut                                      AS exercice_statut,

  -- Budget (lignes budgétaires)
  COALESCE(SUM(lb.credit_initial), 0)           AS dotation_totale,
  COALESCE(SUM(lb.montant_ordonnance), 0)       AS credits_consommes,

  -- Engagements (jointure directe via exercice_id)
  COALESCE(COUNT(DISTINCT eng.id)
    FILTER (WHERE eng.statut = 'VISE'), 0)      AS nb_engagements_vises,
  COALESCE(SUM(eng.montant_engage)
    FILTER (WHERE eng.statut = 'VISE'), 0)      AS montant_engage_vise,
  COALESCE(COUNT(DISTINCT eng.id)
    FILTER (WHERE eng.statut = 'EN_ATTENTE_VISA'), 0) AS nb_engagements_en_attente,

  -- Liquidations (pré-agrégées par CTE)
  COALESCE(liq_agg.montant_liquide, 0)          AS montant_liquide,

  -- Mandats / Paiements (pré-agrégés par CTE, montant = colonne réelle)
  COALESCE(mp_agg.montant_paye, 0)              AS montant_paye,
  COALESCE(mp_agg.montant_en_cours_paiement, 0) AS montant_en_cours_paiement,

  -- Recettes
  COALESCE(SUM(rec.montant_constate), 0)        AS recettes_constatees,
  COALESCE(SUM(rec.montant_recouvre), 0)        AS recettes_recouvrées,

  -- Taux calculés (entiers 0-100)
  CASE
    WHEN COALESCE(SUM(lb.credit_initial), 0) = 0 THEN 0
    ELSE ROUND(
      COALESCE(mp_agg.montant_paye, 0)::NUMERIC
      / SUM(lb.credit_initial)::NUMERIC * 100
    )
  END                                           AS taux_execution_pct,

  CASE
    WHEN COALESCE(SUM(lb.credit_initial), 0) = 0 THEN 0
    ELSE ROUND(
      COALESCE(SUM(eng.montant_engage) FILTER (WHERE eng.statut = 'VISE'), 0)::NUMERIC
      / SUM(lb.credit_initial)::NUMERIC * 100
    )
  END                                           AS taux_engagement_pct

FROM tenants t
JOIN exercices_budgetaires e
  ON e.tenant_id = t.id
LEFT JOIN lignes_budgetaires lb
  ON lb.tenant_id = t.id AND lb.exercice_id = e.id
LEFT JOIN engagements_depenses eng
  ON eng.tenant_id = t.id AND eng.exercice_id = e.id
LEFT JOIN liq_par_exercice liq_agg
  ON liq_agg.tenant_id = t.id AND liq_agg.exercice_id = e.id
LEFT JOIN mp_par_exercice mp_agg
  ON mp_agg.tenant_id = t.id AND mp_agg.exercice_id = e.id
LEFT JOIN recettes rec
  ON rec.tenant_id = t.id AND rec.exercice_id = e.id
WHERE t.statut = 'ACTIF'
GROUP BY
  t.id, t.nom, t.code, e.id, e.annee, e.statut,
  liq_agg.montant_liquide,
  mp_agg.montant_paye,
  mp_agg.montant_en_cours_paiement;

-- 2. Vue alertes nationales (exercices actifs uniquement)
CREATE OR REPLACE VIEW v_alertes_nationales AS
SELECT
  tenant_id,
  ministere_nom,
  ministere_code,
  exercice_id,
  annee,
  taux_execution_pct,
  taux_engagement_pct,
  nb_engagements_en_attente,
  CASE
    WHEN taux_execution_pct < 25
     AND EXTRACT(MONTH FROM now()) > 6
    THEN true ELSE false
  END                               AS alerte_sous_execution,
  CASE
    WHEN taux_execution_pct > 95
    THEN true ELSE false
  END                               AS alerte_sur_execution,
  CASE
    WHEN nb_engagements_en_attente > 10
    THEN true ELSE false
  END                               AS alerte_engagements_bloques
FROM v_execution_nationale
WHERE exercice_statut IN ('OUVERT', 'APPROUVE', 'RECTIFIE');

-- 3. Agrégats nationaux par exercice (une ligne par année)
CREATE OR REPLACE VIEW v_national_exercice AS
SELECT
  annee,
  COUNT(DISTINCT tenant_id)                 AS nb_ministeres,
  SUM(dotation_totale)                      AS dotation_nationale,
  SUM(credits_consommes)                    AS credits_consommes_national,
  SUM(montant_engage_vise)                  AS montant_engage_national,
  SUM(montant_liquide)                      AS montant_liquide_national,
  SUM(montant_paye)                         AS montant_paye_national,
  SUM(recettes_constatees)                  AS recettes_constatees_national,
  SUM(recettes_recouvrées)                  AS recettes_recouvrées_national,
  CASE
    WHEN SUM(dotation_totale) = 0 THEN 0
    ELSE ROUND(SUM(montant_paye)::NUMERIC / SUM(dotation_totale)::NUMERIC * 100)
  END                                       AS taux_execution_national_pct
FROM v_execution_nationale
GROUP BY annee;

-- 4. Index de performance pour les requêtes M9
-- Note : pas d'index sur mandats_paiement(exercice_id) — la colonne n'existe pas
CREATE INDEX IF NOT EXISTS idx_engagements_exercice_statut_m9
  ON engagements_depenses(tenant_id, exercice_id, statut, montant_engage);

CREATE INDEX IF NOT EXISTS idx_liquidations_engagement_statut
  ON liquidations(engagement_id, statut, montant_net);

CREATE INDEX IF NOT EXISTS idx_mandats_liquidation_statut
  ON mandats_paiement(liquidation_id, statut, montant);

CREATE INDEX IF NOT EXISTS idx_recettes_exercice_montants
  ON recettes(tenant_id, exercice_id, montant_constate, montant_recouvre);

CREATE INDEX IF NOT EXISTS idx_lignes_budgetaires_exercice
  ON lignes_budgetaires(tenant_id, exercice_id, credit_initial);

COMMIT;
