-- ═══════════════════════════════════════════════════════════
-- GCAP-GN — Migration 004 : Triggers + RLS complet M3/M4
-- Liquidations, Mandats de paiement
-- LYNXA SARL — Juin 2026
-- ═══════════════════════════════════════════════════════════

BEGIN;

-- ─── 1. FONCTION HELPER : tenant_id sans récursion RLS ────────────────────────
-- SECURITY DEFINER : lit user_profiles en bypassant RLS → pas de récursion infinie
CREATE OR REPLACE FUNCTION public.fn_get_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()
$$;

-- ─── 2. RLS TENANT-WIDE : user_profiles et user_roles ─────────────────────────
-- Remplace la policy "own only" par une lecture au niveau tenant entier
-- (nécessaire pour admin, dropdowns, etc.)

DROP POLICY IF EXISTS "user_profiles_select_own"    ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_select_tenant" ON public.user_profiles;
CREATE POLICY "user_profiles_select_tenant" ON public.user_profiles
  FOR SELECT USING (tenant_id = public.fn_get_tenant_id());

DROP POLICY IF EXISTS "user_roles_select_own"    ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_select_tenant" ON public.user_roles;
CREATE POLICY "user_roles_select_tenant" ON public.user_roles
  FOR SELECT USING (tenant_id = public.fn_get_tenant_id());

-- ─── 3. NUMÉROTATION AUTOMATIQUE LIQUIDATIONS ─────────────────────────────────
--   Format : LIQ-{ANNEE}-{CODE_MINISTERE}-{SEQUENCE_5_CHIFFRES}
--   Ex :     LIQ-2026-MEFB-00001

CREATE OR REPLACE FUNCTION generer_numero_liquidation()
RETURNS TRIGGER AS $$
DECLARE
  v_code  VARCHAR(20);
  v_annee INTEGER;
  v_seq   INTEGER;
BEGIN
  SELECT t.code INTO v_code FROM tenants t WHERE t.id = NEW.tenant_id;
  SELECT EXTRACT(YEAR FROM NOW())::INTEGER INTO v_annee;
  SELECT COALESCE(MAX(
    CASE WHEN numero ~ '^LIQ-\d{4}-\w+-\d+$'
      THEN CAST(SPLIT_PART(numero, '-', 4) AS INTEGER)
    END
  ), 0) + 1 INTO v_seq
  FROM liquidations
  WHERE tenant_id = NEW.tenant_id
    AND EXTRACT(YEAR FROM created_at) = v_annee;
  NEW.numero := FORMAT('LIQ-%s-%s-%s', v_annee, v_code, LPAD(v_seq::TEXT, 5, '0'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_numero_liquidation ON liquidations;
CREATE TRIGGER trg_numero_liquidation
  BEFORE INSERT ON liquidations
  FOR EACH ROW
  WHEN (NEW.numero IS NULL OR NEW.numero = '')
  EXECUTE FUNCTION generer_numero_liquidation();

-- ─── 4. NUMÉROTATION AUTOMATIQUE MANDATS ──────────────────────────────────────
--   Format : MAN-{ANNEE}-{CODE_MINISTERE}-{SEQUENCE_5_CHIFFRES}
--   Ex :     MAN-2026-MEFB-00001

CREATE OR REPLACE FUNCTION generer_numero_mandat()
RETURNS TRIGGER AS $$
DECLARE
  v_code  VARCHAR(20);
  v_annee INTEGER;
  v_seq   INTEGER;
BEGIN
  SELECT t.code INTO v_code FROM tenants t WHERE t.id = NEW.tenant_id;
  SELECT EXTRACT(YEAR FROM NOW())::INTEGER INTO v_annee;
  SELECT COALESCE(MAX(
    CASE WHEN numero ~ '^MAN-\d{4}-\w+-\d+$'
      THEN CAST(SPLIT_PART(numero, '-', 4) AS INTEGER)
    END
  ), 0) + 1 INTO v_seq
  FROM mandats_paiement
  WHERE tenant_id = NEW.tenant_id
    AND EXTRACT(YEAR FROM date_emission) = v_annee;
  NEW.numero := FORMAT('MAN-%s-%s-%s', v_annee, v_code, LPAD(v_seq::TEXT, 5, '0'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_numero_mandat ON mandats_paiement;
CREATE TRIGGER trg_numero_mandat
  BEFORE INSERT ON mandats_paiement
  FOR EACH ROW
  WHEN (NEW.numero IS NULL OR NEW.numero = '')
  EXECUTE FUNCTION generer_numero_mandat();

-- ─── 5. CASCADE : validation liquidation → engagement LIQUIDE + ligne MAJ ─────

CREATE OR REPLACE FUNCTION maj_apres_validation_liquidation()
RETURNS TRIGGER AS $$
BEGIN
  -- Liquidation VALIDEE → engagement devient LIQUIDE + montant_liquide incrément
  IF NEW.statut = 'VALIDEE' AND OLD.statut <> 'VALIDEE' THEN
    UPDATE engagements_depenses
    SET statut = 'LIQUIDE'
    WHERE id = NEW.engagement_id
      AND tenant_id = NEW.tenant_id
      AND statut NOT IN ('ORDONNANCE', 'ANNULE');

    UPDATE lignes_budgetaires lb
    SET montant_liquide = montant_liquide + NEW.montant_net
    FROM engagements_depenses e
    WHERE e.id = NEW.engagement_id
      AND e.tenant_id = NEW.tenant_id
      AND lb.id = e.ligne_budgetaire_id
      AND lb.tenant_id = NEW.tenant_id;
  END IF;

  -- Liquidation ANNULEE depuis VALIDEE → décrémenter montant_liquide
  IF NEW.statut = 'ANNULEE' AND OLD.statut = 'VALIDEE' THEN
    UPDATE lignes_budgetaires lb
    SET montant_liquide = GREATEST(0, montant_liquide - OLD.montant_net)
    FROM engagements_depenses e
    WHERE e.id = NEW.engagement_id
      AND lb.id = e.ligne_budgetaire_id
      AND lb.tenant_id = NEW.tenant_id;

    -- Remettre l'engagement en VISE
    UPDATE engagements_depenses
    SET statut = 'VISE'
    WHERE id = NEW.engagement_id
      AND tenant_id = NEW.tenant_id
      AND statut = 'LIQUIDE';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_maj_liquidation ON liquidations;
CREATE TRIGGER trg_maj_liquidation
  AFTER UPDATE ON liquidations
  FOR EACH ROW
  EXECUTE FUNCTION maj_apres_validation_liquidation();

-- ─── 6. CASCADE : création/MAJ mandat → engagement ORDONNANCE + ligne MAJ ─────

CREATE OR REPLACE FUNCTION maj_apres_insert_mandat()
RETURNS TRIGGER AS $$
BEGIN
  -- Nouvel mandat → engagement devient ORDONNANCE
  UPDATE engagements_depenses e
  SET statut = 'ORDONNANCE'
  FROM liquidations l
  WHERE l.id = NEW.liquidation_id
    AND e.id = l.engagement_id
    AND e.tenant_id = NEW.tenant_id
    AND e.statut <> 'ANNULE';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_insert_mandat ON mandats_paiement;
CREATE TRIGGER trg_insert_mandat
  AFTER INSERT ON mandats_paiement
  FOR EACH ROW
  EXECUTE FUNCTION maj_apres_insert_mandat();

CREATE OR REPLACE FUNCTION maj_apres_statut_mandat()
RETURNS TRIGGER AS $$
BEGIN
  -- Mandat PRIS_EN_CHARGE → incrémenter montant_ordonnance
  IF NEW.statut = 'PRIS_EN_CHARGE' AND OLD.statut <> 'PRIS_EN_CHARGE' THEN
    UPDATE lignes_budgetaires lb
    SET montant_ordonnance = montant_ordonnance + NEW.montant
    FROM liquidations l
    JOIN engagements_depenses e ON e.id = l.engagement_id
    WHERE l.id = NEW.liquidation_id
      AND lb.id = e.ligne_budgetaire_id
      AND lb.tenant_id = NEW.tenant_id;
  END IF;

  -- Mandat REJETE depuis PRIS_EN_CHARGE → décrémenter
  IF NEW.statut = 'REJETE' AND OLD.statut = 'PRIS_EN_CHARGE' THEN
    UPDATE lignes_budgetaires lb
    SET montant_ordonnance = GREATEST(0, montant_ordonnance - OLD.montant)
    FROM liquidations l
    JOIN engagements_depenses e ON e.id = l.engagement_id
    WHERE l.id = NEW.liquidation_id
      AND lb.id = e.ligne_budgetaire_id
      AND lb.tenant_id = NEW.tenant_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_maj_mandat ON mandats_paiement;
CREATE TRIGGER trg_maj_mandat
  AFTER UPDATE ON mandats_paiement
  FOR EACH ROW
  EXECUTE FUNCTION maj_apres_statut_mandat();

-- ─── 7. RLS INSERT/UPDATE sur engagements (explicite) ─────────────────────────
-- La policy "tenant_isolation" de migration 001 est USING uniquement.
-- Pour INSERT/UPDATE, PostegreSQL utilise la USING expression comme WITH CHECK
-- → déjà fonctionnel, pas besoin de recréer.

COMMIT;
