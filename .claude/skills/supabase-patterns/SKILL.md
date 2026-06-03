---
name: supabase-patterns
description: >
  Patterns Supabase spécifiques à GCAP-GN : multi-tenant avec RLS,
  hooks React Query, gestion des erreurs. Utiliser pour tout code
  qui interagit avec la base de données.
---

# Patterns Supabase — GCAP-GN

## Pattern 1 : Client Supabase (singleton)

```typescript
// src/shared/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database.types'

export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

Importer toujours depuis `@/shared/lib/supabase`. Ne jamais recréer un client.

## Pattern 2 : Hook useTenant (OBLIGATOIRE avant toute requête)

```typescript
const { tenant } = useTenant()

// Ne JAMAIS hardcoder un tenant_id
// Ne JAMAIS faire de requête si tenant est null
```

Utiliser `enabled: !!tenant?.id` dans `useQuery` pour bloquer les requêtes prématurées.

## Pattern 3 : Requête avec React Query

```typescript
// src/features/engagements/hooks/use-engagements.ts
export function useEngagements(filters?: EngagementFilters) {
  const { tenant } = useTenant()

  return useQuery({
    queryKey: ['engagements', tenant?.id, filters],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('engagements_depenses')
        .select(`
          *,
          ligne_budgetaire:lignes_budgetaires(code_chapitre, libelle),
          createur:user_profiles!created_by(nom, prenom)
        `)
        .eq('tenant_id', tenant!.id)   // TOUJOURS — jamais sans filtre tenant
        .order('created_at', { ascending: false })

      if (error) throw error
      return data
    },
    enabled: !!tenant?.id,
  })
}
```

## Pattern 4 : Mutation avec invalidation du cache

```typescript
export function useCreateEngagement() {
  const queryClient = useQueryClient()
  const { tenant } = useTenant()

  return useMutation({
    mutationFn: async (data: CreateEngagementInput) => {
      // Vérification crédits disponibles AVANT insertion
      const creditOK = await verifierCreditsDisponibles(
        data.ligne_budgetaire_id,
        data.montant_engage,
        tenant!.id
      )
      if (!creditOK) throw new Error('Crédits insuffisants')

      const { data: result, error } = await supabase
        .from('engagements_depenses')
        .insert({ ...data, tenant_id: tenant!.id })
        .select()
        .single()

      if (error) throw error
      return result
    },
    onSuccess: () => {
      // Invalider les deux caches impactés
      queryClient.invalidateQueries({ queryKey: ['engagements'] })
      queryClient.invalidateQueries({ queryKey: ['lignes-budgetaires'] })
    },
  })
}
```

## Pattern 5 : Gestion des erreurs Supabase

```typescript
// src/shared/lib/errors.ts
export function handleSupabaseError(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    const pgError = error as { code: string; message: string }
    switch (pgError.code) {
      case '23505': return 'Cet enregistrement existe déjà.'
      case '23503': return 'Référence invalide — enregistrement lié introuvable.'
      case '42501': return 'Permission refusée — vérifiez votre rôle.'
      case 'PGRST116': return 'Enregistrement introuvable.'
      default: return `Erreur base de données : ${pgError.message}`
    }
  }
  return 'Erreur inconnue. Veuillez réessayer.'
}
```

## Pattern 6 : Template migration RLS (4 policies standard)

```sql
-- supabase/migrations/001_ma_table.sql
BEGIN;

CREATE TABLE IF NOT EXISTS public.ma_table (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID        NOT NULL REFERENCES public.tenants(id),
  created_by UUID        NOT NULL REFERENCES public.user_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.ma_table ENABLE ROW LEVEL SECURITY;

-- 1. SELECT : même tenant
CREATE POLICY "ma_table_select" ON public.ma_table
  FOR SELECT USING (
    tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid())
  );

-- 2. INSERT : même tenant + rôle autorisé
CREATE POLICY "ma_table_insert" ON public.ma_table
  FOR INSERT WITH CHECK (
    tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('SUPER_ADMIN', 'DAFF', 'SAFF')
        AND actif = true
    )
  );

-- 3. UPDATE : même tenant + rôle autorisé
CREATE POLICY "ma_table_update" ON public.ma_table
  FOR UPDATE USING (
    tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid())
  );

-- 4. DELETE : admin uniquement
CREATE POLICY "ma_table_delete" ON public.ma_table
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('SUPER_ADMIN', 'ADMIN_MINISTERE')
        AND actif = true
    )
  );

COMMIT;
```

## Pattern 7 : Audit log automatique (trigger)

```sql
CREATE OR REPLACE FUNCTION public.log_audit()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.audit_log (
    tenant_id, user_id, action, table_name, record_id, old_values, new_values
  ) VALUES (
    COALESCE(NEW.tenant_id, OLD.tenant_id),
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP != 'DELETE' THEN row_to_json(NEW) ELSE NULL END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```
