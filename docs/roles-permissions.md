# Matrice des Rôles et Permissions — GCAP-GN

## Rôles disponibles (RBAC)

| Code rôle | Libellé | Profil institutionnel |
| --------- | ------- | --------------------- |
| SUPER_ADMIN | Super Administrateur | LYNXA SARL / DSI MEFB |
| ADMIN_MINISTERE | Administrateur Ministère | DAF / DSI du ministère |
| ORDONNATEUR | Ordonnateur | Ministre ou Secrétaire Général |
| DAFF | Gestionnaire Crédits (DAFF) | Chef de la DAFF |
| SAFF | Agent de Saisie (SAFF) | Agent SAFF / Direction nationale |
| CF | Contrôleur Financier | Agent DNCF |
| COMPTABLE_MATIERES | Comptable Matières | Responsable BCM |
| AUDITEUR | Auditeur | Cour des Comptes / Inspecteur |
| GESTIONNAIRE_BUDGET | Gestionnaire Budget MEFB | Bureau Budget MEFB |

## Matrice des permissions par module

| Action | SUPER_ADMIN | ADMIN_MINISTERE | ORDONNATEUR | DAFF | SAFF | CF | AUDITEUR |
| ------ | :---------: | :-------------: | :---------: | :--: | :--: | :-: | :------: |
| Créer engagement | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Valider engagement | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Viser engagement (CF) | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Rejeter engagement (CF) | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Créer liquidation | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Valider liquidation | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Émettre mandat | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Modifier budget | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Voir tout (lecture) | ✅ | ✅ | ✅ | ✅ | ⚠️ | ✅ | ✅ |
| Gérer utilisateurs | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Export comptes admin | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |

⚠️ SAFF : lecture limitée à son périmètre (sa direction nationale uniquement)

## Règle de séparation des fonctions (CRITIQUE)

Un même utilisateur NE PEUT PAS cumuler :

- `SAFF` + `DAFF` — créateur + validateur
- `DAFF` + `CF` — gestionnaire + contrôleur
- `ORDONNATEUR` + `CF` — prescripteur + contrôleur

Cette règle est enforced par :

1. La base de données (contrainte `CHECK` sur la table `user_roles`)
2. Le middleware API (vérification avant toute action)
3. Le frontend (désactivation des boutons selon le rôle)

## Contrôle des permissions côté frontend

```typescript
import { useCurrentUser } from '@/shared/hooks/useCurrentUser'

function hasPermission(role: string, action: string): boolean {
  const PERMISSIONS: Record<string, string[]> = {
    SUPER_ADMIN: ['*'],
    DAFF: ['engagement:create', 'engagement:validate', 'liquidation:create', 'mandat:emit'],
    SAFF: ['engagement:create', 'liquidation:create'],
    CF: ['engagement:viser', 'engagement:rejeter'],
    ORDONNATEUR: ['engagement:validate', 'liquidation:validate', 'mandat:emit'],
    AUDITEUR: ['*:read'],
  }
  const perms = PERMISSIONS[role] ?? []
  return perms.includes('*') || perms.includes(action) || perms.includes(`${action.split(':')[0]}:*`)
}
```
