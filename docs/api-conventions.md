# Conventions API — GCAP-GN

## Structure d'une fonction API (dossier `api/`)

Toutes les fonctions Supabase sont dans `features/<module>/api/`.
**Jamais de requêtes Supabase directement dans les composants ou les hooks.**

```typescript
// features/engagements/api/engagements-api.ts
import { supabase } from '@/shared/lib/supabase'
import type { EngagementType } from '../types'

export async function fetchEngagements(tenantId: string, exerciceId: string) {
  const { data, error } = await supabase
    .from('engagements_depenses')
    .select(`
      *,
      ligne_budgetaire:lignes_budgetaires(code_article, libelle),
      createur:user_profiles!created_by(nom, prenom)
    `)
    .eq('tenant_id', tenantId)          // OBLIGATOIRE
    .eq('exercice_id', exerciceId)
    .order('date_creation', { ascending: false })

  if (error) throw new Error(error.message)
  return data as EngagementType[]
}
```

## Structure d'un hook React Query

```typescript
// features/engagements/hooks/use-engagements.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTenant } from '@/shared/hooks/useTenant'
import { QUERY_KEYS } from '@/shared/constants'
import { fetchEngagements, createEngagement } from '../api/engagements-api'

export function useEngagements(exerciceId: string) {
  const { tenant } = useTenant()

  return useQuery({
    queryKey: [QUERY_KEYS.ENGAGEMENTS, tenant?.id, exerciceId],
    queryFn: () => fetchEngagements(tenant!.id, exerciceId),
    enabled: !!tenant?.id && !!exerciceId,
  })
}

export function useCreateEngagement() {
  const { tenant } = useTenant()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: EngagementInput) =>
      createEngagement({ ...input, tenant_id: tenant!.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ENGAGEMENTS] })
    },
  })
}
```

## Gestion des erreurs

```typescript
// Pattern standard pour toutes les fonctions API
export async function maFonction(tenantId: string) {
  const { data, error } = await supabase
    .from('ma_table')
    .select('*')
    .eq('tenant_id', tenantId)

  if (error) throw new Error(`[ma_table] ${error.message}`)
  return data
}
```

Les erreurs remontent via React Query — les composants reçoivent `isError` et `error`.

## Nommage des fichiers API

| Fichier | Convention | Exemple |
| ------- | ---------- | ------- |
| Fichier API | `<module>-api.ts` | `engagements-api.ts` |
| Hook Query | `use-<module>.ts` | `use-engagements.ts` |
| Hook Mutation | `use-<action>-<module>.ts` | `use-create-engagement.ts` |

## Clés React Query (`QUERY_KEYS`)

Toujours utiliser les clés définies dans `@/shared/constants` :

```typescript
[QUERY_KEYS.ENGAGEMENTS, tenantId, exerciceId]
[QUERY_KEYS.BUDGET, tenantId, exerciceId]
[QUERY_KEYS.LIQUIDATIONS, tenantId, engagementId]
```

## Sélections Supabase recommandées

```typescript
// Engagement complet avec jointures
.select(`
  *,
  ligne_budgetaire:lignes_budgetaires(
    code_titre, code_chapitre, code_article, code_paragraphe, libelle
  ),
  createur:user_profiles!created_by(nom, prenom, poste),
  viseur:user_profiles!vise_par(nom, prenom)
`)

// Liste allégée pour les tableaux
.select('id, numero, objet, montant_engage, statut, date_creation')
```

## Pagination

```typescript
const PAGE_SIZE = 20

const { data, count } = await supabase
  .from('engagements_depenses')
  .select('*', { count: 'exact' })
  .eq('tenant_id', tenantId)
  .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
```
