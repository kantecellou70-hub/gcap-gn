# Accessibilité GCAP-GN — WCAG 2.1 AA

## Niveau de conformité visé

**WCAG 2.1 Niveau AA** — ciblé pour l'ensemble de l'application.

Contexte matériel : postes 1024×768, Chrome 110+/Firefox 115+/Edge 110+, souris + clavier, connexion 3G–fibre.

---

## Composants audités

| Composant | Statut | Notes |
|-----------|--------|-------|
| `DataTable` | ✅ | `scope="col"`, `aria-label`, `aria-busy`, navigation clavier (Enter/Space), pagination ARIA |
| `Sidebar` | ✅ | `aria-label` sur `<aside>` et `<nav>`, icônes `aria-hidden`, groupes `role="group"` |
| `TopBar` | ✅ | `aria-label` menu utilisateur, `aria-expanded`, `role="menu"` sur dropdown |
| `LoginPage` | ✅ | Labels associés aux inputs via `htmlFor`, erreurs liées |
| `EngagementsPage` | ✅ | `aria-label` sur select de filtre, `aria-label` sur bouton action |
| `AuditPage` | ✅ | `aria-label` sur bouton export CSV |
| `SandboxBanner` | ✅ | `role="status"`, `aria-label` |
| `ConfirmDialog` | ⚠️ | À vérifier : `role="dialog"` + `aria-modal` + `useFocusTrap` à appliquer |
| Formulaires d'engagement | ⚠️ | `htmlFor`/`aria-describedby` à vérifier au cas par cas |
| Modals/Drawers (features) | ⚠️ | `useFocusTrap` disponible — à appliquer sur chaque modal |

Légende : ✅ Conforme AA | ⚠️ Partiel / À vérifier | ❌ Non conforme

---

## Ratios de contraste vérifiés

Source : `src/shared/lib/contrastAudit.ts` — outil utilisé : WebAIM Contrast Checker.

| Élément | Ratio | Statut |
|---------|-------|--------|
| Texte principal (slate-800 / white) | 16.1:1 | ✅ AA Pass |
| Texte secondaire (slate-500 / white) | 5.74:1 | ✅ AA Pass |
| Texte tertiaire (slate-400 / white) | 3.54:1 | ⚠️ AA Grand texte uniquement |
| Sidebar nav inactif (slate-400 / slate-900) | 4.84:1 | ✅ AA Pass |
| Sidebar nav actif (white / indigo-600) | 4.72:1 | ✅ AA Pass |
| Badge VISE (green-700 / green-100) | 5.1:1 | ✅ AA Pass |
| Badge REJETE (red-700 / red-100) | 5.2:1 | ✅ AA Pass |
| Badge EN_ATTENTE (amber-700 / amber-100) | 4.58:1 | ✅ AA Pass |
| Bouton primaire (white / indigo-600) | 4.72:1 | ✅ AA Pass |
| Label groupe nav (slate-600 / slate-900) | 3.07:1 | ⚠️ Décoratif uniquement |

---

## Navigation clavier

### Hook `useFocusTrap`

Fichier : `src/shared/hooks/useFocusTrap.ts`

- Intercepte `Tab` et `Shift+Tab` dans un container désigné
- Boucle le focus entre le premier et dernier élément focusable
- Restaure le focus sur l'élément déclencheur à la fermeture
- À appliquer sur **tous les modals et drawers** via `useFocusTrap(isOpen, containerRef)`

### Ordre de tabulation prioritaire

1. Sidebar : navigation via `Tab` entre les liens (ordre logique HTML)
2. DataTable : chaque ligne cliquable a `tabIndex={0}`, activable avec `Enter` ou `Espace`
3. Pagination : boutons précédent/page/suivant avec `aria-label` et `aria-current="page"`
4. Modals : focus piégé tant qu'ouvert, `Escape` pour fermer (à implémenter dans chaque modal)
5. Dropdowns TopBar : `role="menu"` avec `aria-expanded`

---

## Responsive 1024×768

- Sidebar fixe 224px (`w-56`) — scroll interne sur les petits écrans
- DataTable : colonnes secondaires masquables avec `hidden lg:table-cell`
- Dashboard KPIs : `grid-cols-2 sm:grid-cols-4` — 2 colonnes sur petits écrans
- Modals : `max-w-[90vw]` recommandé pour les petits écrans

---

## Messages d'erreur Zod (français)

Fichier : `src/shared/lib/zodMessages.ts`

Tous les schemas Zod doivent utiliser `zodMessages` pour afficher des messages en français :

```typescript
import { zodMessages } from '@/shared/lib/zodMessages'

z.string().min(1, zodMessages.required)
z.string().email(zodMessages.email)
z.number().positive(zodMessages.positive).int(zodMessages.integer)
```

---

## Points résiduels V2

- [ ] Appliquer `useFocusTrap` sur `ConfirmDialog` et tous les drawers de détail
- [ ] Ajouter `aria-live="polite"` sur les zones de notification dans les formulaires
- [ ] Vérifier `StatutBadge` — s'assurer que la couleur n'est pas le seul vecteur d'information
- [ ] Tester avec lecteur d'écran (NVDA/Firefox sous Windows)
- [ ] Audit automatisé avec axe-core en CI (via `@axe-core/playwright`)
