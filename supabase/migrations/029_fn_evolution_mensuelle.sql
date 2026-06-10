-- ═══════════════════════════════════════════════════════════
-- Migration 029 : Fonctions RPC pour l'évolution mensuelle
-- Remplace les queries directes sur mandats_paiement et
-- engagements_depenses dans fetchEvolutionMensuelle.
-- L'agrégation côté serveur supprime le plafond PostgREST 1000 lignes.
-- make_timestamptz garantit les bornes UTC — cohérent avec migration 028.
-- Idempotentes (CREATE OR REPLACE).
-- ═══════════════════════════════════════════════════════════

BEGIN;

-- Agrégation mensuelle des mandats payés par tenant/année
CREATE OR REPLACE FUNCTION public.fn_evolution_mandats_mensuels(
  p_tenant_id uuid,
  p_annee     int
)
RETURNS TABLE(mois int, montant_paye bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXTRACT(MONTH FROM date_emission)::int AS mois,
    SUM(montant)::bigint                   AS montant_paye
  FROM mandats_paiement
  WHERE tenant_id = p_tenant_id
    AND statut    = 'PAYE'
    AND date_emission >= make_timestamptz(p_annee,     1, 1, 0, 0, 0, 'UTC')
    AND date_emission <  make_timestamptz(p_annee + 1, 1, 1, 0, 0, 0, 'UTC')
  GROUP BY 1
  ORDER BY 1;
$$;

-- Agrégation mensuelle des engagements visés par tenant/année
CREATE OR REPLACE FUNCTION public.fn_evolution_engagements_mensuels(
  p_tenant_id uuid,
  p_annee     int
)
RETURNS TABLE(mois int, montant_engage bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXTRACT(MONTH FROM date_creation)::int AS mois,
    SUM(montant_engage)::bigint            AS montant_engage
  FROM engagements_depenses
  WHERE tenant_id = p_tenant_id
    AND statut    = 'VISE'
    AND date_creation >= make_timestamptz(p_annee,     1, 1, 0, 0, 0, 'UTC')
    AND date_creation <  make_timestamptz(p_annee + 1, 1, 1, 0, 0, 0, 'UTC')
  GROUP BY 1
  ORDER BY 1;
$$;

GRANT EXECUTE ON FUNCTION public.fn_evolution_mandats_mensuels(uuid, int)
  TO authenticated;

GRANT EXECUTE ON FUNCTION public.fn_evolution_engagements_mensuels(uuid, int)
  TO authenticated;

COMMENT ON FUNCTION public.fn_evolution_mandats_mensuels(uuid, int) IS
  'Agrégation mensuelle des mandats PAYE pour un tenant/année. '
  'Retourne au plus 12 lignes — supprime le plafond PostgREST 1000 lignes.';

COMMENT ON FUNCTION public.fn_evolution_engagements_mensuels(uuid, int) IS
  'Agrégation mensuelle des engagements VISE pour un tenant/année. '
  'Retourne au plus 12 lignes — supprime le plafond PostgREST 1000 lignes.';

COMMIT;
