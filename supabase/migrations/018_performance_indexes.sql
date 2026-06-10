BEGIN;

-- Engagements : tri par date (requête la plus fréquente — pagination serveur)
CREATE INDEX IF NOT EXISTS idx_engagements_tenant_exercice_created
  ON engagements_depenses(tenant_id, exercice_id, date_creation DESC);

-- Engagements : filtre par statut (onglet "En attente de visa")
CREATE INDEX IF NOT EXISTS idx_engagements_tenant_statut
  ON engagements_depenses(tenant_id, statut)
  WHERE statut IN ('EN_ATTENTE_VISA', 'VISE', 'REJETE');

-- Engagements : recherche full-text sur l'objet
CREATE INDEX IF NOT EXISTS idx_engagements_objet_gin
  ON engagements_depenses USING gin(to_tsvector('french', objet));

-- Liquidations : tri par date + filtre par statut
CREATE INDEX IF NOT EXISTS idx_liquidations_tenant_statut_created
  ON liquidations(tenant_id, statut, created_at DESC);

-- Mandats : tri par date d'émission + filtre par statut
CREATE INDEX IF NOT EXISTS idx_mandats_tenant_statut_emission
  ON mandats_paiement(tenant_id, statut, date_emission DESC);

-- Lignes budgétaires : lookup par nomenclature (fréquent dans les formulaires)
CREATE INDEX IF NOT EXISTS idx_lignes_tenant_nomenclature
  ON lignes_budgetaires(tenant_id, code_titre, code_chapitre, code_article);

-- Audit log : tri par date (pagination serveur sur /audit)
CREATE INDEX IF NOT EXISTS idx_audit_tenant_created
  ON audit_log(tenant_id, created_at DESC);

-- Audit log : filtre par action (liste déroulante des actions)
CREATE INDEX IF NOT EXISTS idx_audit_tenant_action
  ON audit_log(tenant_id, action);

-- Mettre à jour les statistiques de l'optimiseur de requêtes
ANALYZE engagements_depenses;
ANALYZE liquidations;
ANALYZE mandats_paiement;
ANALYZE lignes_budgetaires;
ANALYZE audit_log;

COMMIT;
