-- ═══════════════════════════════════════════════════════════
-- Migration 024 : Remise à zéro des données de test
-- Supprime toutes les données transactionnelles de tous les
-- tenants SAUF le tenant DEMO (conservé pour les présentations).
--
-- Idempotente : peut être rejouée sans effet de bord.
-- ═══════════════════════════════════════════════════════════

BEGIN;

-- Vérification préalable : le tenant DEMO doit exister
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.tenants WHERE code = 'DEMO') THEN
    RAISE EXCEPTION 'Tenant DEMO introuvable — migration annulée';
  END IF;
END $$;

-- Toutes les suppressions ciblent les tenants hors DEMO
-- Ordre respectant les dépendances FK (enfants avant parents)

-- 1. Notifications (référencent engagements_depenses)
DELETE FROM public.notifications
WHERE tenant_id != (SELECT id FROM public.tenants WHERE code = 'DEMO');

-- 2. Mandats de paiement (référencent liquidations)
DELETE FROM public.mandats_paiement
WHERE tenant_id != (SELECT id FROM public.tenants WHERE code = 'DEMO');

-- 3. Liquidations (référencent engagements_depenses)
DELETE FROM public.liquidations
WHERE tenant_id != (SELECT id FROM public.tenants WHERE code = 'DEMO');

-- 4. Engagements de dépenses (référencent lignes_budgetaires)
DELETE FROM public.engagements_depenses
WHERE tenant_id != (SELECT id FROM public.tenants WHERE code = 'DEMO');

-- 5. Recettes (référencent exercices_budgetaires)
DELETE FROM public.recettes
WHERE tenant_id != (SELECT id FROM public.tenants WHERE code = 'DEMO');

-- 6. Biens / matières
DELETE FROM public.biens
WHERE tenant_id != (SELECT id FROM public.tenants WHERE code = 'DEMO');

-- 7. Fournisseurs
DELETE FROM public.fournisseurs
WHERE tenant_id != (SELECT id FROM public.tenants WHERE code = 'DEMO');

-- 8. Lignes budgétaires (référencent exercices_budgetaires)
DELETE FROM public.lignes_budgetaires
WHERE tenant_id != (SELECT id FROM public.tenants WHERE code = 'DEMO');

-- 9. Exercices budgétaires
DELETE FROM public.exercices_budgetaires
WHERE tenant_id != (SELECT id FROM public.tenants WHERE code = 'DEMO');

-- 10. Journaux d'audit
DELETE FROM public.audit_log
WHERE tenant_id != (SELECT id FROM public.tenants WHERE code = 'DEMO');

DELETE FROM public.audit_log_archives
WHERE tenant_id != (SELECT id FROM public.tenants WHERE code = 'DEMO');

-- Vérification finale
DO $$
DECLARE
  demo_id UUID;
  nb_eng  INTEGER;
  nb_liq  INTEGER;
  nb_mand INTEGER;
  nb_exo  INTEGER;
BEGIN
  SELECT id INTO demo_id FROM public.tenants WHERE code = 'DEMO';

  SELECT COUNT(*) INTO nb_eng  FROM public.engagements_depenses WHERE tenant_id != demo_id;
  SELECT COUNT(*) INTO nb_liq  FROM public.liquidations           WHERE tenant_id != demo_id;
  SELECT COUNT(*) INTO nb_mand FROM public.mandats_paiement       WHERE tenant_id != demo_id;
  SELECT COUNT(*) INTO nb_exo  FROM public.exercices_budgetaires  WHERE tenant_id != demo_id;

  IF nb_eng > 0 OR nb_liq > 0 OR nb_mand > 0 OR nb_exo > 0 THEN
    RAISE EXCEPTION 'Remise à zéro incomplète — engagements:% liquidations:% mandats:% exercices:%',
      nb_eng, nb_liq, nb_mand, nb_exo;
  END IF;

  RAISE NOTICE 'Remise à zéro OK — toutes les données hors DEMO ont été supprimées.';
END $$;

COMMIT;
