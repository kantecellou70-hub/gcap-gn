BEGIN;

-- Colonnes MFA sur user_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'mfa_enrolled_at'
  ) THEN
    ALTER TABLE public.user_profiles
      ADD COLUMN mfa_enrolled_at TIMESTAMPTZ,
      ADD COLUMN mfa_required    BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

-- Vue conformité MFA : utilisateurs avec MFA requis mais non enrollé
CREATE OR REPLACE VIEW public.v_mfa_compliance AS
SELECT
  up.id,
  up.nom,
  up.prenom,
  up.poste,
  ur.role,
  ur.tenant_id,
  up.mfa_enrolled_at,
  up.mfa_required,
  CASE
    WHEN ur.role IN ('SUPER_ADMIN', 'ORDONNATEUR', 'CF') AND up.mfa_enrolled_at IS NULL
    THEN true
    ELSE false
  END AS mfa_manquant
FROM public.user_profiles up
JOIN public.user_roles ur ON ur.user_id = up.id;

COMMIT;
