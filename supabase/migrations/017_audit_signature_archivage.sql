BEGIN;

-- 1. Colonne signature sur audit_log
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audit_log' AND column_name = 'signature'
  ) THEN
    ALTER TABLE public.audit_log ADD COLUMN signature TEXT;
  END IF;
END $$;

-- 2. Colonne exercice_id pour le rattachement fiscal
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audit_log' AND column_name = 'exercice_id'
  ) THEN
    ALTER TABLE public.audit_log
      ADD COLUMN exercice_id UUID REFERENCES public.exercices_budgetaires(id);
  END IF;
END $$;

-- 3. Index pour les requêtes de filtrage fréquentes
CREATE INDEX IF NOT EXISTS idx_audit_tenant_action
  ON public.audit_log(tenant_id, action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_tenant_user
  ON public.audit_log(tenant_id, user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_exercice
  ON public.audit_log(exercice_id, created_at DESC)
  WHERE exercice_id IS NOT NULL;

-- 4. Table d'archivage (même structure qu'audit_log)
CREATE TABLE IF NOT EXISTS public.audit_log_archives (
  LIKE public.audit_log INCLUDING ALL
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audit_log_archives' AND column_name = 'archived_at'
  ) THEN
    ALTER TABLE public.audit_log_archives ADD COLUMN archived_at TIMESTAMPTZ DEFAULT now();
  END IF;
END $$;

ALTER TABLE public.audit_log_archives ENABLE ROW LEVEL SECURITY;

-- Archives : immutables (mêmes règles que audit_log)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_rules
    WHERE tablename = 'audit_log_archives' AND rulename = 'no_delete_audit_archives'
  ) THEN
    CREATE RULE no_delete_audit_archives AS
      ON DELETE TO public.audit_log_archives DO INSTEAD NOTHING;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_rules
    WHERE tablename = 'audit_log_archives' AND rulename = 'no_update_audit_archives'
  ) THEN
    CREATE RULE no_update_audit_archives AS
      ON UPDATE TO public.audit_log_archives DO INSTEAD NOTHING;
  END IF;
END $$;

DROP POLICY IF EXISTS "audit_archives_select" ON public.audit_log_archives;
CREATE POLICY "audit_archives_select" ON public.audit_log_archives
  FOR SELECT USING (
    tenant_id = (
      SELECT tenant_id FROM public.user_roles
      WHERE user_id = auth.uid()
      LIMIT 1
    )
  );

-- 5. Fonction d'archivage d'un exercice clôturé
CREATE OR REPLACE FUNCTION public.archive_audit_exercice(p_exercice_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_count INTEGER;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.exercices_budgetaires
    WHERE id = p_exercice_id AND statut = 'CLOTURE'
  ) THEN
    RAISE EXCEPTION 'Exercice % non clôturé — archivage refusé', p_exercice_id;
  END IF;

  INSERT INTO public.audit_log_archives
  SELECT *, now() AS archived_at
  FROM public.audit_log
  WHERE exercice_id = p_exercice_id
  ON CONFLICT (id) DO NOTHING;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  DELETE FROM public.audit_log WHERE exercice_id = p_exercice_id;

  RAISE NOTICE 'Archivé % entrées pour exercice %', v_count, p_exercice_id;
  RETURN v_count;
END;
$$;

-- 6. Vue matérialisée pour les statistiques audit
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_audit_stats AS
SELECT
  tenant_id,
  action,
  DATE_TRUNC('day', created_at) AS jour,
  COUNT(*)                       AS nb_actions,
  COUNT(DISTINCT user_id)        AS nb_utilisateurs
FROM public.audit_log
GROUP BY tenant_id, action, DATE_TRUNC('day', created_at)
WITH DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_audit_stats
  ON public.mv_audit_stats(tenant_id, action, jour);

COMMIT;
