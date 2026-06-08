# MFA — Authentification Multi-Facteurs GCAP-GN

## 1. Procédure Supabase Dashboard (actions manuelles obligatoires)

Avant la mise en production, effectuer ces 4 actions dans le Supabase Dashboard :

### 1.1 Email sécurisé
`Authentication → Providers → Email`
- **Secure email change** : ON
- **Double confirm email changes** : ON

### 1.2 Sessions
`Authentication → Sessions`
- **JWT expiry** : `3600` (1 heure — remplacer la valeur par défaut de 86 400)
- L'inactivité est gérée côté client (30 min) — voir section 5

### 1.3 MFA TOTP
`Authentication → MFA`
- **Activer TOTP** : ON
- **Max enrolled factors per user** : `3` (permet un appareil de backup)

### 1.4 Rate limits
`Authentication → Rate Limits`
- Vérifier que les limites de tentatives de connexion sont actives (défaut Supabase : recommandé)

---

## 2. Matrice MFA par rôle

| Rôle | MFA V1 | Justification |
|------|--------|---------------|
| `SUPER_ADMIN` | **Obligatoire** | Accès total multi-tenant — LYNXA / MEFB |
| `ORDONNATEUR` | **Obligatoire** | Engage et ordonnance les dépenses publiques |
| `CF` | **Obligatoire** | Vise et valide les engagements — garant légal |
| `ADMIN_MINISTERE` | Recommandé | Gère les utilisateurs d'un ministère |
| `DAFF` | Recommandé | Chef DAFF — accès étendu aux données |
| `AUDITEUR` | Recommandé | Lecture seule mais données sensibles |
| `SAFF` | Non requis | Saisie uniquement |
| `COMPTABLE_MATIERES` | Non requis | Périmètre limité au module matières |

---

## 3. Guide utilisateur — Configuration MFA en 3 étapes

### Étape 1 — Installer une application TOTP

Téléchargez l'une de ces applications sur votre smartphone :
- **Google Authenticator** (Android / iOS)
- **Authy** (Android / iOS — recommandé pour les backups)
- **Microsoft Authenticator** (Android / iOS)

### Étape 2 — Scanner le QR code

1. Connectez-vous à GCAP-GN avec votre email et mot de passe
2. Vous serez redirigé vers la page **"Sécurisez votre compte"**
3. Cliquez **"Configurer l'authentification à deux facteurs"**
4. Ouvrez votre application TOTP → icône `+` → **"Scanner un QR code"**
5. Pointez votre caméra sur le QR code affiché dans GCAP-GN
6. Si votre caméra ne fonctionne pas → cliquez **"Saisie manuelle"** et entrez la clé base32

### Étape 3 — Vérifier et activer

1. Votre application affiche un code à 6 chiffres qui change toutes les 30 secondes
2. Entrez ce code dans les 6 cases de la page GCAP-GN
3. Cliquez **"Vérifier et activer"**
4. Message de confirmation → accès au tableau de bord débloqué

---

## 4. Procédure de récupération (perte de téléphone)

En cas de perte ou remplacement de l'appareil TOTP :

1. **L'agent** contacte son **ADMIN_MINISTERE** (DAF ou responsable informatique)
2. **L'ADMIN_MINISTERE** contacte **LYNXA SARL** à : `support@lynxatech.gn`
3. **LYNXA SARL** supprime les factors MFA de l'utilisateur via Supabase Dashboard :
   - `Authentication → Users → [email de l'agent] → MFA → Supprimer tous les factors`
4. L'agent peut se reconnecter et re-enroller depuis un nouvel appareil

> **Note** : La suppression MFA par LYNXA SARL est auditée dans les logs Supabase.

---

## 5. Timeout de session (inactivité)

| Seuil | Action |
|-------|--------|
| 25 min d'inactivité | Modal d'avertissement : **"Votre session va expirer dans 5 min"** |
| 30 min d'inactivité | Déconnexion automatique → redirection `/login?reason=timeout` |
| Reprise d'activité | Réinitialisation du timer (clic, frappe, scroll, touch) |
| Onglet en arrière-plan | Timer suspendu pendant que l'onglet est invisible |

Les événements qui réinitialisent le timer : `mousemove`, `keydown`, `click`, `touchstart`, `scroll`.

---

## 6. Guide ADMIN_MINISTERE — Vue conformité MFA

Pour vérifier quels utilisateurs de votre ministère ont le MFA requis mais non configuré, exécutez cette requête dans Supabase (via le SQL Editor) :

```sql
SELECT
  nom,
  prenom,
  role,
  mfa_enrolled_at,
  mfa_manquant
FROM v_mfa_compliance
WHERE tenant_id = '<votre_tenant_id>'
  AND mfa_manquant = true
ORDER BY role, nom;
```

**Colonnes clés :**
- `mfa_manquant = true` → l'utilisateur a un rôle obligatoire MFA mais n'a pas encore enrollé
- `mfa_enrolled_at` → date d'activation du MFA (NULL si non configuré)

---

## 7. Architecture technique

### Flux d'authentification complet

```
LoginPage
  ↓ signInWithPassword (Supabase)
  ↓ Session aal1 créée
ProtectedRoute (vérifie isAuthenticated)
  ↓
MfaGuard
  ├─ Rôle ne requiert pas MFA → laisse passer
  ├─ Rôle requiert MFA, non enrollé → /mfa/enroll
  ├─ Rôle requiert MFA, enrollé + aal2 → laisse passer
  └─ Rôle requiert MFA, enrollé + aal1 → /mfa/challenge
       ↓ verifyMfaChallenge (Supabase)
       ↓ Session aal2 créée
       → /tableau-de-bord
```

### Fichiers clés

| Fichier | Rôle |
|---------|------|
| `src/shared/hooks/useInactivityTimeout.ts` | Timer d'inactivité + callbacks |
| `src/features/auth/components/SessionWarningModal.tsx` | Modal 5 min avant expiration |
| `src/features/auth/mfa/api/mfaApi.ts` | Wrapper `supabase.auth.mfa.*` |
| `src/features/auth/mfa/hooks/useMfa.ts` | État MFA + actions |
| `src/features/auth/mfa/components/OtpInput.tsx` | Input OTP 6 cases réutilisable |
| `src/features/auth/mfa/pages/MfaEnrollPage.tsx` | Enrollment 3 étapes |
| `src/features/auth/mfa/pages/MfaChallengePage.tsx` | Challenge au login |
| `src/features/auth/mfa/components/MfaSettingsCard.tsx` | Carte paramètres utilisateur |
| `src/app/router/MfaGuard.tsx` | Guard MFA dans le routeur |
| `src/shared/constants/permissions.ts` | `MFA_REQUIRED_ROLES` + `isMfaRequired()` |
| `supabase/migrations/016_mfa_audit.sql` | Colonnes MFA + vue conformité |

### Constantes MFA

```typescript
// src/shared/constants/permissions.ts
export const MFA_REQUIRED_ROLES: Role[] = ['SUPER_ADMIN', 'ORDONNATEUR', 'CF']
export function isMfaRequired(role: Role): boolean
```

### Niveaux d'assurance (AAL)
- `aal1` — session valide (mot de passe seul)
- `aal2` — session valide + MFA vérifié dans cette session

---

## 8. Scénarios de test manuels

### Test A — Timeout d'inactivité
1. Se connecter avec un rôle quelconque (ex: DAFF)
2. Rester inactif 25 minutes → le modal d'avertissement s'affiche
3. Cliquer **"Rester connecté"** → le timer se réinitialise
4. Laisser expirer → redirection `/login?reason=timeout` + bandeau ambre

> Dev : modifier `timeoutMs: 10_000` dans `AppShell.tsx` pour simuler

### Test B — Enrollment MFA (ORDONNATEUR)
1. Se connecter en tant que ORDONNATEUR (sans MFA préalable)
2. Redirection automatique vers `/mfa/enroll`
3. Scanner le QR code avec une app TOTP
4. Entrer le code à 6 chiffres → activation confirmée
5. Accès au `/tableau-de-bord` débloqué

### Test C — Challenge MFA au login
1. Se déconnecter (session aal2 expirée)
2. Se reconnecter → après mot de passe correct → page `/mfa/challenge`
3. Saisir le code TOTP → accès accordé
4. Saisir un mauvais code → message d'erreur rouge

### Test D — Rôle SAFF (pas de MFA)
1. Se connecter en tant que SAFF
2. Accès direct au tableau de bord **sans** redirection vers `/mfa/enroll`

---

*Documentation générée pour GCAP-GN — LYNXA SARL © 2026*
