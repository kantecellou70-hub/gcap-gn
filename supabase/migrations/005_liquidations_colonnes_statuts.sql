-- ═══════════════════════════════════════════════════════════
-- GCAP-GN — Migration 005 : Liquidations — colonnes détail + statuts
-- LYNXA SARL — Juin 2026
-- ═══════════════════════════════════════════════════════════

-- Décomposition des déductions
ALTER TABLE liquidations
  ADD COLUMN IF NOT EXISTS retenue_source   INTEGER NOT NULL DEFAULT 0 CHECK (retenue_source   >= 0),
  ADD COLUMN IF NOT EXISTS penalite_retard  INTEGER NOT NULL DEFAULT 0 CHECK (penalite_retard  >= 0),
  ADD COLUMN IF NOT EXISTS avance_recuperee INTEGER NOT NULL DEFAULT 0 CHECK (avance_recuperee >= 0),
  ADD COLUMN IF NOT EXISTS date_facture     DATE,
  ADD COLUMN IF NOT EXISTS numero_facture   VARCHAR(50),
  ADD COLUMN IF NOT EXISTS validated_by     UUID REFERENCES user_profiles(id),
  ADD COLUMN IF NOT EXISTS motif_rejet      TEXT;

-- Cycle de vie complet : BROUILLON → SOUMISE → VALIDEE/REJETEE → ANNULEE
ALTER TABLE liquidations ALTER COLUMN statut SET DEFAULT 'BROUILLON';
ALTER TABLE liquidations DROP CONSTRAINT IF EXISTS liquidations_statut_check;
ALTER TABLE liquidations ADD CONSTRAINT liquidations_statut_check
  CHECK (statut IN ('BROUILLON', 'SOUMISE', 'VALIDEE', 'REJETEE', 'ANNULEE'));
