-- ═══════════════════════════════════════════════════════════
-- GCAP-GN — Migration 006 : Mandats — colonnes + statuts enrichis
-- LYNXA SARL — Juin 2026
-- ═══════════════════════════════════════════════════════════

ALTER TABLE mandats_paiement
  ADD COLUMN IF NOT EXISTS engagement_id              UUID REFERENCES engagements_depenses(id),
  ADD COLUMN IF NOT EXISTS date_paiement              TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reference_tresor           VARCHAR(100),
  ADD COLUMN IF NOT EXISTS banque_beneficiaire        VARCHAR(200),
  ADD COLUMN IF NOT EXISTS numero_compte_beneficiaire VARCHAR(100),
  ADD COLUMN IF NOT EXISTS observations               TEXT;

ALTER TABLE mandats_paiement DROP CONSTRAINT IF EXISTS mandats_paiement_mode_paiement_check;
ALTER TABLE mandats_paiement ADD CONSTRAINT mandats_paiement_mode_paiement_check
  CHECK (mode_paiement IN ('VIREMENT', 'VIREMENT_BANCAIRE', 'CHEQUE', 'CHEQUE_TRESOR', 'CAISSE', 'MOBILE_MONEY'));

ALTER TABLE mandats_paiement DROP CONSTRAINT IF EXISTS mandats_paiement_statut_check;
ALTER TABLE mandats_paiement ADD CONSTRAINT mandats_paiement_statut_check
  CHECK (statut IN ('EMIS', 'TRANSMIS_TRESOR', 'PRIS_EN_CHARGE', 'PAYE', 'REJETE', 'REJETE_TRESOR', 'ANNULE'));

CREATE OR REPLACE FUNCTION fn_mandat_set_engagement_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.engagement_id IS NULL THEN
    SELECT engagement_id INTO NEW.engagement_id
    FROM liquidations WHERE id = NEW.liquidation_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_mandat_set_engagement ON mandats_paiement;
CREATE TRIGGER trg_mandat_set_engagement
  BEFORE INSERT ON mandats_paiement
  FOR EACH ROW
  EXECUTE FUNCTION fn_mandat_set_engagement_id();
