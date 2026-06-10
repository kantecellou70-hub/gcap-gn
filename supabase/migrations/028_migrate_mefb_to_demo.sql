-- ═══════════════════════════════════════════════════════════
-- Migration 028 : Transfert données MEFB → DEMO + suspension
-- Les données de test saisies sous le tenant MEFB sont rattachées
-- au tenant DEMO (démonstration), puis MEFB est suspendu.
-- Valeurs autorisées par tenants_statut_check : ACTIF | SUSPENDU
-- Écrite en SQL pur (pas de DO $$) pour compatibilité SQL Editor.
-- ═══════════════════════════════════════════════════════════

BEGIN;

-- Ordre FK : enfants avant parents (changement de tenant_id, pas de suppression)
-- Les FK inter-tables portent sur les colonnes id, pas tenant_id → pas de contrainte
-- à respecter pour l'ordre des UPDATE. L'UPDATE tenants vient en dernier par sécurité.

UPDATE notifications
  SET tenant_id = (SELECT id FROM tenants WHERE code = 'DEMO')
  WHERE tenant_id = (SELECT id FROM tenants WHERE code = 'MEFB');

UPDATE audit_log
  SET tenant_id = (SELECT id FROM tenants WHERE code = 'DEMO')
  WHERE tenant_id = (SELECT id FROM tenants WHERE code = 'MEFB');

UPDATE biens
  SET tenant_id = (SELECT id FROM tenants WHERE code = 'DEMO')
  WHERE tenant_id = (SELECT id FROM tenants WHERE code = 'MEFB');

UPDATE mandats_paiement
  SET tenant_id = (SELECT id FROM tenants WHERE code = 'DEMO')
  WHERE tenant_id = (SELECT id FROM tenants WHERE code = 'MEFB');

UPDATE liquidations
  SET tenant_id = (SELECT id FROM tenants WHERE code = 'DEMO')
  WHERE tenant_id = (SELECT id FROM tenants WHERE code = 'MEFB');

UPDATE engagements_depenses
  SET tenant_id = (SELECT id FROM tenants WHERE code = 'DEMO')
  WHERE tenant_id = (SELECT id FROM tenants WHERE code = 'MEFB');

UPDATE recettes
  SET tenant_id = (SELECT id FROM tenants WHERE code = 'DEMO')
  WHERE tenant_id = (SELECT id FROM tenants WHERE code = 'MEFB');

UPDATE lignes_budgetaires
  SET tenant_id = (SELECT id FROM tenants WHERE code = 'DEMO')
  WHERE tenant_id = (SELECT id FROM tenants WHERE code = 'MEFB');

UPDATE exercices_budgetaires
  SET tenant_id = (SELECT id FROM tenants WHERE code = 'DEMO')
  WHERE tenant_id = (SELECT id FROM tenants WHERE code = 'MEFB');

UPDATE user_roles
  SET tenant_id = (SELECT id FROM tenants WHERE code = 'DEMO')
  WHERE tenant_id = (SELECT id FROM tenants WHERE code = 'MEFB');

UPDATE user_profiles
  SET tenant_id = (SELECT id FROM tenants WHERE code = 'DEMO')
  WHERE tenant_id = (SELECT id FROM tenants WHERE code = 'MEFB');

-- Suspendre MEFB en dernier
UPDATE tenants
  SET statut = 'SUSPENDU'
  WHERE code = 'MEFB';

-- Vérification intégrée
SELECT t.code, t.statut, COUNT(up.id)::int AS nb_users
FROM tenants t
LEFT JOIN user_profiles up ON up.tenant_id = t.id
WHERE t.code IN ('MEFB', 'DEMO')
GROUP BY t.code, t.statut
ORDER BY t.code;
-- Résultat attendu :
-- DEMO | ACTIF    | 8
-- MEFB | SUSPENDU | 0

COMMIT;
