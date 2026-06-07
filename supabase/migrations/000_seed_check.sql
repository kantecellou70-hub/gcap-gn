-- ═══════════════════════════════════════════════════════════
-- GCAP-GN — Migration 000 : Vérification seed nomenclature
-- Idempotente — peut être rejouée sans effet de bord
-- LYNXA SARL — Juin 2026
-- ═══════════════════════════════════════════════════════════
--
-- Ce script vérifie et ré-insère si nécessaire les 20 articles
-- de la nomenclature budgétaire guinéenne (seed de référence).
-- Utiliser UNIQUEMENT après que la migration 010 a été appliquée.
--
-- Usage : psql $DATABASE_URL -f supabase/migrations/000_seed_check.sql

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                 WHERE table_name = 'nomenclature_budgetaire') THEN
    RAISE EXCEPTION 'La table nomenclature_budgetaire n''existe pas. Appliquer 010_nomenclature_budgetaire.sql d''abord.';
  END IF;
END $$;

INSERT INTO public.nomenclature_budgetaire
  (code_titre, libelle_titre, code_chapitre, libelle_chapitre,
   code_article, libelle_article, type_credit)
VALUES
  ('02','Dépenses de personnel','0201','Rémunérations du personnel',
   '020101','Salaires et indemnités de base','FONCTIONNEMENT'),
  ('02','Dépenses de personnel','0201','Rémunérations du personnel',
   '020102','Primes et avantages','FONCTIONNEMENT'),
  ('02','Dépenses de personnel','0202','Charges sociales',
   '020201','Cotisations patronales CNSS','FONCTIONNEMENT'),
  ('03','Biens et services','0301','Achats de fournitures',
   '030101','Fournitures de bureau','FONCTIONNEMENT'),
  ('03','Biens et services','0301','Achats de fournitures',
   '030102','Fournitures informatiques','FONCTIONNEMENT'),
  ('03','Biens et services','0302','Services extérieurs',
   '030201','Prestations de services','FONCTIONNEMENT'),
  ('03','Biens et services','0302','Services extérieurs',
   '030202','Locations','FONCTIONNEMENT'),
  ('03','Biens et services','0303','Frais de déplacement',
   '030301','Missions intérieures','FONCTIONNEMENT'),
  ('03','Biens et services','0303','Frais de déplacement',
   '030302','Missions extérieures','FONCTIONNEMENT'),
  ('03','Biens et services','0304','Énergie et eau',
   '030401','Électricité','FONCTIONNEMENT'),
  ('03','Biens et services','0304','Énergie et eau',
   '030402','Eau et assainissement','FONCTIONNEMENT'),
  ('03','Biens et services','0305','Télécommunications',
   '030501','Téléphone et internet','FONCTIONNEMENT'),
  ('04','Transferts et subventions','0401','Subventions aux EPA',
   '040101','Subventions de fonctionnement','TRANSFERT'),
  ('04','Transferts et subventions','0401','Subventions aux EPA',
   '040102','Subventions d''investissement','TRANSFERT'),
  ('04','Transferts et subventions','0402','Bourses et aides sociales',
   '040201','Bourses d''études','TRANSFERT'),
  ('05','Investissements de l''État','0501','Constructions et travaux',
   '050101','Bâtiments administratifs','INVESTISSEMENT'),
  ('05','Investissements de l''État','0502','Acquisition d''équipements',
   '050201','Matériel informatique','INVESTISSEMENT'),
  ('05','Investissements de l''État','0502','Acquisition d''équipements',
   '050202','Mobilier de bureau','INVESTISSEMENT'),
  ('05','Investissements de l''État','0502','Acquisition d''équipements',
   '050203','Véhicules administratifs','INVESTISSEMENT')
ON CONFLICT DO NOTHING;

-- Vérification finale
DO $$
DECLARE
  cnt INTEGER;
BEGIN
  SELECT COUNT(*) INTO cnt FROM public.nomenclature_budgetaire WHERE tenant_id IS NULL;
  IF cnt < 19 THEN
    RAISE WARNING 'Seed nomenclature incomplet : % articles (attendu : 19+)', cnt;
  ELSE
    RAISE NOTICE 'Seed nomenclature OK : % articles de référence présents', cnt;
  END IF;
END $$;
