-- Migration 023 : Tenant de formation SANDBOX
-- Idempotente — peut être rejouée sans effet

BEGIN;

INSERT INTO public.tenants (code, nom, type, statut)
VALUES ('SANDBOX', 'Environnement de Formation GCAP-GN', 'DIRECTION', 'ACTIF')
ON CONFLICT (code) DO NOTHING;

COMMIT;
