-- ═══════════════════════════════════════════════════════════
-- GCAP-GN — Migration 003 : Triggers et fonctions engagements
-- LYNXA SARL — Juin 2026
-- ═══════════════════════════════════════════════════════════

-- 1. Fonction : génération automatique du numéro d'engagement
--    Format : ENG-{ANNEE}-{CODE_MINISTERE}-{SEQUENCE_5_CHIFFRES}
--    Exemple : ENG-2026-MEFB-00042
CREATE OR REPLACE FUNCTION generer_numero_engagement()
RETURNS TRIGGER AS $$
DECLARE
  v_code  VARCHAR(20);
  v_annee INTEGER;
  v_seq   INTEGER;
BEGIN
  SELECT t.code INTO v_code
  FROM tenants t WHERE t.id = NEW.tenant_id;

  SELECT EXTRACT(YEAR FROM NOW())::INTEGER INTO v_annee;

  SELECT COALESCE(MAX(
    CAST(SPLIT_PART(numero, '-', 4) AS INTEGER)
  ), 0) + 1 INTO v_seq
  FROM engagements_depenses
  WHERE tenant_id = NEW.tenant_id
    AND EXTRACT(YEAR FROM date_creation) = v_annee;

  NEW.numero := FORMAT('ENG-%s-%s-%s', v_annee, v_code, LPAD(v_seq::TEXT, 5, '0'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_numero_engagement ON engagements_depenses;
CREATE TRIGGER trg_numero_engagement
  BEFORE INSERT ON engagements_depenses
  FOR EACH ROW
  WHEN (NEW.numero IS NULL OR NEW.numero = '')
  EXECUTE FUNCTION generer_numero_engagement();

-- 2. Fonction : vérifier la disponibilité des crédits avant engagement
CREATE OR REPLACE FUNCTION verifier_credits_disponibles(
  p_ligne_id  UUID,
  p_montant   INTEGER,
  p_tenant_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_disponible INTEGER;
BEGIN
  SELECT (credit_revise - montant_engage) INTO v_disponible
  FROM lignes_budgetaires
  WHERE id = p_ligne_id AND tenant_id = p_tenant_id;

  RETURN v_disponible >= p_montant;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Fonction : mettre à jour montant_engage lors du passage à VISE
--    Et le décrémenter si l'engagement visé est annulé
CREATE OR REPLACE FUNCTION maj_montant_engage_apres_visa()
RETURNS TRIGGER AS $$
BEGIN
  -- Engagement visé → incrémenter montant_engage
  IF NEW.statut = 'VISE' AND OLD.statut != 'VISE' THEN
    UPDATE lignes_budgetaires
    SET montant_engage = montant_engage + NEW.montant_engage
    WHERE id = NEW.ligne_budgetaire_id AND tenant_id = NEW.tenant_id;
  END IF;

  -- Engagement visé annulé → décrémenter (sans passer sous 0)
  IF NEW.statut = 'ANNULE' AND OLD.statut = 'VISE' THEN
    UPDATE lignes_budgetaires
    SET montant_engage = GREATEST(0, montant_engage - NEW.montant_engage)
    WHERE id = NEW.ligne_budgetaire_id AND tenant_id = NEW.tenant_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_maj_montant_engage ON engagements_depenses;
CREATE TRIGGER trg_maj_montant_engage
  AFTER UPDATE ON engagements_depenses
  FOR EACH ROW
  EXECUTE FUNCTION maj_montant_engage_apres_visa();
