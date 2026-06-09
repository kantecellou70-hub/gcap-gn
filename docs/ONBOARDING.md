# Onboarding & Formation — GCAP-GN

Guide complet pour les formateurs, administrateurs et agents de terrain.

---

## Pour les agents : premier login en 5 étapes

1. **Recevoir l'invitation** — votre administrateur vous envoie un email avec un lien d'activation (valable 24h).
2. **Définir votre mot de passe** — cliquez sur le lien, choisissez un mot de passe fort (12+ caractères, majuscule + chiffre).
3. **Se connecter** — accédez à l'URL fournie par votre DAFF, entrez votre email et mot de passe.
4. **Suivre la visite guidée** — au premier accès, une visite interactive se lance automatiquement après 1 seconde. Suivez les 3-4 étapes adaptées à votre rôle.
5. **Télécharger votre manuel** — menu utilisateur (coin haut-droite) → "Télécharger mon manuel" → PDF adapté à votre profil.

---

## Tour guidé — comment le relancer

Le tour se lance automatiquement au premier login sur le tableau de bord.

Pour le relancer manuellement :
- Cliquez sur votre avatar en haut à droite
- Sélectionnez **"Reprendre la visite guidée"**
- Le tour repart depuis la première étape adaptée à votre rôle

Le tour est sauvegardé dans le navigateur (`localStorage`). Vider le cache du navigateur réinitialise l'état "premier login".

### Tours disponibles par rôle

| Rôle | Étapes | Thème |
|------|--------|-------|
| SAFF / Agent saisie | 4 | Créer mon premier engagement |
| CF | 3 | Viser mes engagements |
| Ordonnateur | 2 | Émettre un mandat |
| DAFF / Admin | 3 | Gérer le budget |
| Auditeur | 2 | Consulter le journal |

---

## Manuel PDF — comment le télécharger

1. Connectez-vous à GCAP-GN
2. Cliquez sur votre avatar en haut à droite
3. Sélectionnez **"Télécharger mon manuel"**
4. Un toast "Manuel en cours de génération…" apparaît
5. Le PDF se télécharge automatiquement

Le nom du fichier suit le format : `GCAP-GN_Manuel_[ROLE]_[NOM]_[DATE].pdf`

Contenu du PDF :
- Page de couverture avec bandeau tricolore guinéen
- Description de votre rôle et séparation des fonctions (LOLF)
- 2-3 pages d'actions pas-à-pas adaptées à votre profil
- Page support avec procédure en 5 étapes

---

## Pour le formateur : utiliser la sandbox

### Accéder à l'environnement de formation

Sur la page de connexion, un lien discret en bas de page : **"Accéder à l'environnement de formation →"**

Comptes disponibles (mot de passe formation : `Formation2026!`) :

| Email | Rôle |
|-------|------|
| `saff@formation.gcap-gn.gn` | Agent SAFF |
| `cf@formation.gcap-gn.gn` | Contrôleur Financier |
| `ordonnateur@formation.gcap-gn.gn` | Ordonnateur |
| `daff@formation.gcap-gn.gn` | DAFF |
| `auditeur@formation.gcap-gn.gn` | Auditeur |

> **Important** : changer les mots de passe après chaque session de formation publique.

### Identifier la sandbox

Une bannière **violette** sticky s'affiche en haut de chaque page :
> "Mode Formation — Les données sont fictives. Aucun impact sur la production."

Cette bannière est **uniquement visible** sur le tenant `SANDBOX`. Elle n'apparaît jamais sur les tenants ministériels réels.

### Réinitialiser les données

Disponible pour les rôles `SUPER_ADMIN` et `ADMIN_MINISTERE` uniquement.

1. Cliquer sur **"Réinitialiser les données"** dans la bannière violette
2. Confirmer la boîte de dialogue
3. Les données sont réinitialisées via le script `scripts/seed-sandbox.ts`

Pour une réinitialisation complète depuis la CLI :
```bash
npx tsx scripts/seed-sandbox.ts
```

---

## Pour le SUPER_ADMIN : activer un ministère

Voir le guide détaillé : [ONBOARDING_MINISTERES.md](./ONBOARDING_MINISTERES.md)

Résumé :
1. Accéder à `/super-admin/tenants`
2. Créer le tenant (code ministère, nom officiel, type)
3. Créer le premier compte `ADMIN_MINISTERE` (email officiel)
4. L'administrateur reçoit une invitation par email (Resend)
5. L'administrateur crée son équipe via `/administration/utilisateurs`
6. Créer l'exercice budgétaire via `/administration`

---

## Architecture technique du module onboarding

```
src/features/onboarding/
├── components/
│   ├── OnboardingTrigger.tsx   # Lance le tour auto au 1er login (dans DashboardPage)
│   └── SandboxBanner.tsx       # Bannière violette si tenant.code === 'SANDBOX'
├── hooks/
│   └── useOnboarding.ts        # État tour : localStorage['gcap-tour-completed-{userId}']
└── lib/
    ├── tourConfig.ts            # Tours par rôle (driver.js steps)
    └── manuelPdf.ts             # Génération PDF jsPDF (import dynamique)
```

Dépendances :
- `driver.js` — tour guidé (import dynamique, ~8 Ko gzip, CSS séparé)
- `jspdf` — génération PDF (déjà présent, import dynamique)
