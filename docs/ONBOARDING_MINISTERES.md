# Procédure d'activation d'un nouveau ministère — GCAP-GN

Guide à l'usage du SUPER_ADMIN LYNXA pour activer les 27 ministères guinéens.

---

## Étape 1 — Accéder à la gestion des ministères

1. Se connecter avec le compte SUPER_ADMIN
2. Dans la sidebar → section **VUE NATIONALE MEFB** → **Gestion ministères**
3. URL directe : `/super-admin/tenants`

Le tableau affiche les 27 ministères avec leur statut d'activation.

---

## Étape 2 — Créer le premier administrateur (DAF)

1. Repérer le ministère souhaité (statut **Non activé**)
2. Cliquer sur le bouton **Activer** (colonne Actions)
3. Remplir le formulaire :
   - **Prénom** et **Nom** du DAF
   - **Email professionnel** du DAF (`prenom.nom@ministere.gov.gn`)
   - **Poste** (optionnel)
   - **Rôle initial** : `ADMIN_MINISTERE` (recommandé pour le premier utilisateur)
4. Cliquer **Créer et envoyer l'invitation**

Le DAF reçoit un email d'invitation avec un **lien de première connexion valable 24 heures**.

---

## Étape 3 — Vérifier l'activation

- Statut passe à **Actif** (vert) dès qu'un compte utilisateur est créé
- Vérifier dans **Supabase Dashboard → Authentication → Users** que le compte apparaît

---

## Étape 4 — Le DAF configure son équipe

Une fois connecté, le DAF (ADMIN_MINISTERE) peut :

1. **Module Administration → Utilisateurs** → créer ses collaborateurs :
   - DAFF (Directeur Administratif et Financier)
   - SAFF (Agent Sous-direction)
   - CF (Contrôleur Financier)
   - ORDONNATEUR
2. **Module Administration → Exercices** → créer l'exercice budgétaire de l'année
3. **Module Budget** → saisir les lignes budgétaires

---

## Étape 5 — Vérification depuis le dashboard national

- `/super-admin/dashboard` → le ministère apparaît dans le tableau de bord consolidé
- Les données remontent dans la vue M9 et l'export LOLF

---

## Résolution de problèmes

### Lien d'invitation expiré (> 24h)

Le SUPER_ADMIN ne peut pas re-générer le lien depuis l'interface pour l'instant.

**Procédure manuelle :**
1. Supabase Dashboard → Authentication → Users
2. Trouver l'email du DAF
3. Cliquer sur l'utilisateur → **Send magic link** ou **Send recovery email**
4. Informer le DAF par email ou téléphone

### Rôle attribué incorrectement

```sql
-- Désactiver l'ancien rôle
UPDATE user_roles SET actif = false
WHERE user_id = '<user_id>';

-- Attribuer le bon rôle
INSERT INTO user_roles (user_id, tenant_id, role, actif)
VALUES ('<user_id>', '<tenant_id>', 'ADMIN_MINISTERE', true);
```

### Email d'invitation non reçu

1. Vérifier la configuration de la clé `RESEND_API_KEY` dans Supabase (Dashboard → Edge Functions → Secrets)
2. Vérifier les logs : Supabase Dashboard → Edge Functions → `send-invitation-email` → Logs
3. En cas d'erreur RESEND : vérifier que le domaine d'envoi est vérifié dans Resend

### Ministère à suspendre temporairement

Depuis la base de données :
```sql
UPDATE tenants SET statut = 'SUSPENDU' WHERE code = 'MJ';
```

---

## Template email d'invitation — Personnalisation Supabase Auth

Si vous utilisez `inviteUserByEmail` de Supabase (envoi automatique) et souhaitez personnaliser le template :

1. Supabase Dashboard → **Authentication** → **Email Templates**
2. Sélectionner **Invite user**
3. Remplacer le contenu par le template GCAP-GN (couleurs : `#1E293B` header, `#4F46E5` CTA)
4. La barre tricolore guinéenne : Rouge `#CE1126`, Jaune `#FCD116`, Vert `#009A44`

> Note : La Edge Function `send-invitation-email` utilise Resend avec un template GCAP-GN intégré. Si `RESEND_API_KEY` est configuré, l'email brandé est envoyé automatiquement lors de la création d'un utilisateur via `create-ministry-user`.

---

## Architecture technique — Flux de création

```
SUPER_ADMIN (frontend)
  ↓ POST supabase.functions.invoke('create-ministry-user', { body: payload })
  ↓ JWT SUPER_ADMIN vérifié dans la Edge Function
  ↓
create-ministry-user (Edge Function — service role)
  ├── auth.admin.generateLink({ type: 'invite', email }) → invite_link
  ├── INSERT user_profiles (id, tenant_id, nom, prenom, poste)
  ├── INSERT user_roles (user_id, tenant_id, role)
  └── functions.invoke('send-invitation-email', { body: { email, invite_link, ... } })
        └── Resend API → email de bienvenue GCAP-GN
  ↓
Retour : { success: true, user_id }
  ↓
Frontend : toast.success + invalidate query ['tenants-stats']
```

---

*Document GCAP-GN — LYNXA SARL © 2026*
