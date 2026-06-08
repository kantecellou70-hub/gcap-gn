-- ═══════════════════════════════════════════════════════════
-- GCAP-GN — Migration 011 : Storage bucket pièces jointes
-- Bucket Supabase Storage pour les engagements de dépenses
-- LYNXA SARL — Juin 2026
-- ═══════════════════════════════════════════════════════════
--
-- Structure des chemins : {tenant_id}/{engagement_id}/{timestamp}_{nom_fichier}.{ext}
-- Le bucket est public → getPublicUrl() utilisé côté client (pas de signed URL)
-- RLS sur storage.objects contrôle upload/suppression par tenant
-- ═══════════════════════════════════════════════════════════

BEGIN;

-- ─── 1. BUCKET ────────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'engagements',
  'engagements',
  true,
  10485760,   -- 10 Mo max par fichier
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public            = true,
  file_size_limit   = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ─── 2. POLICY UPLOAD (INSERT) ────────────────────────────────────────────────
-- Seul l'utilisateur du bon tenant peut uploader.
-- Le premier segment de chemin DOIT être son tenant_id.

DROP POLICY IF EXISTS "engagements_storage_insert" ON storage.objects;
CREATE POLICY "engagements_storage_insert" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'engagements'
    AND (storage.foldername(name))[1]::uuid = public.fn_get_tenant_id()
  );

-- ─── 3. POLICY SUPPRESSION (DELETE) ──────────────────────────────────────────
-- Seul un utilisateur du même tenant peut supprimer.

DROP POLICY IF EXISTS "engagements_storage_delete" ON storage.objects;
CREATE POLICY "engagements_storage_delete" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'engagements'
    AND (storage.foldername(name))[1]::uuid = public.fn_get_tenant_id()
  );

-- ─── 4. POLICY LECTURE API (SELECT) ──────────────────────────────────────────
-- Restreint les lectures via API au tenant (les URLs publiques ne passent pas par RLS).

DROP POLICY IF EXISTS "engagements_storage_select" ON storage.objects;
CREATE POLICY "engagements_storage_select" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'engagements'
    AND (storage.foldername(name))[1]::uuid = public.fn_get_tenant_id()
  );

COMMIT;
