-- ═══════════════════════════════════════════════════════════
-- GCAP-GN — Migration 013 : Notifications temps réel
-- LYNXA SARL — Juin 2026
-- ═══════════════════════════════════════════════════════════

BEGIN;

-- ─── Table notifications ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type       TEXT        NOT NULL CHECK (type IN (
    'engagement_visa_requis', 'engagement_vise', 'engagement_rejete',
    'liquidation_prete', 'mandat_emis', 'mandat_rejete_tresor',
    'budget_seuil_90', 'exercice_cloture'
  )),
  titre      TEXT        NOT NULL,
  message    TEXT        NOT NULL,
  lu         BOOLEAN     NOT NULL DEFAULT false,
  priorite   TEXT        NOT NULL DEFAULT 'normale' CHECK (priorite IN ('normale', 'urgente')),
  lien       TEXT,
  metadata   JSONB       NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  lu_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_tenant
  ON public.notifications (user_id, tenant_id, lu, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_tenant_created
  ON public.notifications (tenant_id, created_at DESC);

-- ─── Realtime (REPLICA IDENTITY pour les colonnes dans le payload) ────────────

ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- ─── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select" ON public.notifications;
CREATE POLICY "notifications_select" ON public.notifications
  FOR SELECT USING (
    user_id = auth.uid()
    AND tenant_id = (
      SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

-- Inserts uniquement via SECURITY DEFINER (dispatch_notification)
DROP POLICY IF EXISTS "notifications_insert_service" ON public.notifications;
CREATE POLICY "notifications_insert_service" ON public.notifications
  FOR INSERT WITH CHECK (false);

-- Utilisateur peut marquer ses notifications comme lues
DROP POLICY IF EXISTS "notifications_update_lu" ON public.notifications;
CREATE POLICY "notifications_update_lu" ON public.notifications
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ─── Permissions ──────────────────────────────────────────────────────────────

GRANT SELECT                ON public.notifications TO authenticated;
GRANT UPDATE (lu, lu_at)    ON public.notifications TO authenticated;
GRANT SELECT                ON public.notifications TO anon;

-- ─── Fonction dispatch_notification ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.dispatch_notification(
  p_tenant_id UUID,
  p_type      TEXT,
  p_titre     TEXT,
  p_message   TEXT,
  p_roles     TEXT[],
  p_lien      TEXT    DEFAULT NULL,
  p_priorite  TEXT    DEFAULT 'normale',
  p_metadata  JSONB   DEFAULT '{}'
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications
    (tenant_id, user_id, type, titre, message, lien, priorite, metadata)
  SELECT
    p_tenant_id,
    up.id,
    p_type,
    p_titre,
    p_message,
    p_lien,
    p_priorite,
    p_metadata
  FROM public.user_roles ur
  JOIN public.user_profiles up ON up.id = ur.user_id
  WHERE ur.tenant_id = p_tenant_id
    AND ur.role = ANY(p_roles)
    AND ur.actif = true;
END;
$$;

COMMIT;
